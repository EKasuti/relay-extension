import React, { useState } from 'react';
import type { Shift, Timesheet } from '../types';
import ManualEntry from './ManualEntry';
import ShiftList from './ShiftList';
import TimesheetSelection from './TimesheetSelection';
import TimesheetDetail from './TimesheetDetail';
import {
    scrapeTimesheets,
    findLinkAndUrl,
    startTimesheet,
    returnToTimesheetList,
    fillShiftRow,
    checkValidationErrors
} from '../utils/jobx';

interface JobXWorkflowProps {
    shifts: Shift[];
    setShifts: (shifts: Shift[]) => void;
    availableJobs: string[];
    onFetchJobs: () => Promise<void>;
    onExit: () => void;
}

const JobXWorkflow: React.FC<JobXWorkflowProps> = ({
    shifts,
    setShifts,
    availableJobs,
    onFetchJobs,
}) => {
    // Internal State
    const [step, setStep] = useState<'job-matching' | 'timesheet-selection' | 'timesheet-detail' | 'manual-entry'>('job-matching');
    const [scrapedTimesheets, setScrapedTimesheets] = useState<Timesheet[]>([]);
    const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
    const [activeJobTitle, setActiveJobTitle] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Helper for script execution
    const execute = async <T,>(fn: (...args: any[]) => T, args: any[] = [], world: 'ISOLATED' | 'MAIN' = 'ISOLATED'): Promise<{ result: T } | null> => {
        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            setErrorMessage('Chrome APIs not available');
            return null;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return null;

        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: args,
                func: fn,
                world: world
            });
            return results[0] as { result: T };
        } catch (e) {
            console.error('Script execution error:', e);
            setErrorMessage('Script execution failed.');
            return null;
        }
    };

    const handleAutoFill = async (jobTitle: string) => {
        setErrorMessage(null);
        setActiveJobTitle(jobTitle);

        // 1. Navigate
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const DASHBOARD_URL_PART = 'jobx_userdashboard.aspx';
        const isDashboard = tab.url?.includes(DASHBOARD_URL_PART);

        if (isDashboard) {
            const navResult = await execute(findLinkAndUrl, [jobTitle]);
            if (!navResult?.result.found) {
                setErrorMessage(navResult?.result.message || 'Navigation failed');
                return;
            }
            await chrome.tabs.update(tab.id, { url: navResult.result.url });
            // Wait for load
            let loaded = false;
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 500));
                const check = await execute(() => !!document.getElementById('Skin_body_TimesheetList'));
                if (check?.result) { loaded = true; break; }
            }
            if (!loaded) { setErrorMessage('Timeout waiting for timesheet list.'); return; }
        }

        // 2. Scrape
        const scrapeResult = await execute(scrapeTimesheets);
        if (scrapeResult?.result.success && scrapeResult.result.data) {
            setScrapedTimesheets(scrapeResult.result.data as Timesheet[]);
            setStep('timesheet-selection');
        } else {
            setErrorMessage(scrapeResult?.result.message || 'Failed to scrape timesheets');
        }
    };

    const handleTimesheetSelected = async (timesheet: Timesheet) => {
        // Do not update global shifts here; we want to preserve them.
        setActiveTimesheet(timesheet);

        const result = await execute(startTimesheet, [timesheet.elementIndex], 'MAIN');
        if (result?.result && !result.result.success) {
            setErrorMessage(result.result.message);
        }

        setStep('timesheet-detail');
    };

    const handleBackFromDetail = async () => {
        // Go back to selection
        setStep('timesheet-selection');
        setActiveTimesheet(null);
        // Also try to navigate browser back to list
        const res = await execute(returnToTimesheetList, [], 'MAIN');
        if (!res?.result.success) {
        } else {
            const maxAttempts = 5;
            const delayMs = 500;

            const pollScrape = async (attempt: number) => {
                const scrapeResult = await execute(scrapeTimesheets);
                if (scrapeResult?.result.success && scrapeResult.result.data) {
                    setScrapedTimesheets(scrapeResult.result.data as Timesheet[]);
                    return;
                }
                if (attempt < maxAttempts) {
                    setTimeout(() => {
                        pollScrape(attempt + 1);
                    }, delayMs);
                }
            };

            // Start polling immediately rather than waiting a fixed delay once
            pollScrape(0);
        }
    };

    const handleTransferShifts = async (selectedShifts: Shift[]) => {
        setErrorMessage(null);
        let currentShifts = [...shifts];

        // Process shifts sequentially
        for (const shift of selectedShifts) {
            // Skip already filled shifts if needed, but user might want to retry error ones.
            if (shift.fillStatus === 'success') continue;

            const result = await execute(fillShiftRow, [shift.date, shift.startTime, shift.endTime], 'MAIN');

            if (result?.result && !result.result.success) {
                // Update shift with error
                const msg = result.result.debug ? `${result.result.message} (${result.result.debug})` : result.result.message;

                currentShifts = currentShifts.map(s =>
                    (s.date === shift.date && s.startTime === shift.startTime && s.endTime === shift.endTime)
                        ? { ...s, fillStatus: 'error', fillMessage: msg } as Shift
                        : s
                );
                setShifts(currentShifts);
                continue;
            } else if (!result?.result) {
                setErrorMessage('Execution failed.');
                break;
            }

            await new Promise(r => setTimeout(r, 2000));

            let loaded = false;
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 1000));
                // Check if table exists again
                const check = await execute(() => !!document.querySelector('table.timesheetAddEntryTable') || !!document.getElementById('Skin_body_ctl01_AddButton_'));
                if (check?.result) { loaded = true; break; }
            }

            if (!loaded) {
                setErrorMessage(`Timeout waiting for reload after saving shift on ${shift.date}`);
                currentShifts = currentShifts.map(s =>
                    (s.date === shift.date && s.startTime === shift.startTime && s.endTime === shift.endTime)
                        ? { ...s, fillStatus: 'error', fillMessage: 'Timeout waiting for reload' } as Shift
                        : s
                );
                setShifts(currentShifts);
                break; // Stop on timeout
            }

            // Check for Validation Errors on the new page
            const validationCheck = await execute(checkValidationErrors, [], 'MAIN');
            if (validationCheck?.result && validationCheck.result.hasError) {
                currentShifts = currentShifts.map(s =>
                    (s.date === shift.date && s.startTime === shift.startTime && s.endTime === shift.endTime)
                        ? { ...s, fillStatus: 'error', fillMessage: validationCheck.result.message || 'Validation Error' } as Shift
                        : s
                );
                setShifts(currentShifts);
                continue;
            }

            // Mark as success
            currentShifts = currentShifts.map(s =>
                (s.date === shift.date && s.startTime === shift.startTime && s.endTime === shift.endTime)
                    ? { ...s, fillStatus: 'success', fillMessage: 'Filled' } as Shift
                    : s
            );
            setShifts(currentShifts);
        }
    };

    return (
        <div className="w-full">
            {errorMessage && (
                <div className="w-full max-w-sm mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                    <span className="font-bold">Error:</span> {errorMessage}
                    <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold">×</button>
                </div>
            )}

            {step === 'job-matching' && (
                <ShiftList
                    shifts={shifts}
                    onAddManualShift={() => {
                        setActiveJobTitle(null);
                        setActiveTimesheet(null);
                        setStep('manual-entry');
                    }}
                    availableJobs={availableJobs}
                    onFetchJobs={onFetchJobs}
                    onAutoFill={handleAutoFill}
                />
            )}

            {step === 'timesheet-selection' && (
                <TimesheetSelection
                    timesheets={scrapedTimesheets}
                    shifts={shifts}
                    onSelect={handleTimesheetSelected}
                    onBack={() => {
                        setStep('job-matching');
                    }}
                />
            )}

            {step === 'timesheet-detail' && activeTimesheet && (
                <TimesheetDetail
                    timesheet={activeTimesheet}
                    shifts={shifts.filter(s => {
                        const shiftDate = new Date(s.date);
                        const start = new Date(activeTimesheet.startDate);
                        const end = new Date(activeTimesheet.endDate);

                        // If any of the dates cannot be parsed, exclude the shift from this timesheet.
                        if (
                            isNaN(shiftDate.getTime()) ||
                            isNaN(start.getTime()) ||
                            isNaN(end.getTime())
                        ) {
                            return false;
                        }

                        // Normalize to date-only (year, month, day) to avoid time-zone/off-by-one issues.
                        const shiftDay = new Date(
                            shiftDate.getFullYear(),
                            shiftDate.getMonth(),
                            shiftDate.getDate()
                        );
                        const startDay = new Date(
                            start.getFullYear(),
                            start.getMonth(),
                            start.getDate()
                        );
                        const endDay = new Date(
                            end.getFullYear(),
                            end.getMonth(),
                            end.getDate()
                        );

                        return shiftDay >= startDay && shiftDay <= endDay;
                    })}
                    jobTitle={activeJobTitle || 'Unknown Job'}
                    onBack={handleBackFromDetail}
                    onAddShift={() => setStep('manual-entry')}
                    onTransferShifts={handleTransferShifts}
                />
            )}

            {step === 'manual-entry' && (
                <ManualEntry
                    onBack={() => {
                        if (activeTimesheet) setStep('timesheet-detail');
                        else setStep('job-matching');
                    }}
                    onShiftAdded={(shift) => {
                        setShifts([...shifts, shift]);
                        if (activeTimesheet) setStep('timesheet-detail');
                        else setStep('job-matching');
                    }}
                    preselectedJobTitle={activeTimesheet ? (activeJobTitle || undefined) : undefined}
                />
            )}
        </div>
    );
};

export default JobXWorkflow;
