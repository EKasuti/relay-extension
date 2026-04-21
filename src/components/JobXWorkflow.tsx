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
    checkExistingShiftEntry,
    checkValidationErrors,
    parseTime
} from '../utils/jobx';

interface JobXWorkflowProps {
    shifts: Shift[];
    setShifts: (shifts: Shift[]) => void;
    availableJobs: string[];
    onFetchJobs: () => Promise<void>;
    onExit: () => void;
    isRandomMode?: boolean;
}

const JobXWorkflow: React.FC<JobXWorkflowProps> = ({
    shifts,
    setShifts,
    availableJobs,
    onFetchJobs,
    onExit,
    isRandomMode
}) => {
    const toDayNumber = (value: string): number | null => {
        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            const y = Number(isoMatch[1]);
            const m = Number(isoMatch[2]) - 1;
            const d = Number(isoMatch[3]);
            return new Date(y, m, d).getTime();
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
    };

    // Internal State
    const [step, setStep] = useState<'job-matching' | 'timesheet-selection' | 'timesheet-detail' | 'manual-entry'>('job-matching');
    const [scrapedTimesheets, setScrapedTimesheets] = useState<Timesheet[]>([]);
    const [activeTimesheet, setActiveTimesheet] = useState<Timesheet | null>(null);
    const [activeJobTitle, setActiveJobTitle] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);

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
        } catch (e: any) {
            console.error('Script execution error:', e);
            setErrorMessage(e.message || 'Script execution failed.');
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

    const SHIFT_SAVE_DELAY_MS = 2000;
    const PAGE_RELOAD_CHECK_INTERVAL_MS = 1000;
    const MAX_RELOAD_ATTEMPTS = 20;

    const checkTableExists = () => !!document.querySelector('table.timesheetAddEntryTable') || !!document.getElementById('Skin_body_ctl01_AddButton_');

    const updateShiftStatus = (
        shiftsArray: Shift[],
        targetShift: Shift,
        status: 'success' | 'error',
        message: string
    ) => {
        return shiftsArray.map(s =>
            (s.date === targetShift.date && s.startTime === targetShift.startTime && s.endTime === targetShift.endTime)
                ? { ...s, fillStatus: status, fillMessage: message } as Shift
                : s
        );
    };

    const handleTransferShifts = async (selectedShifts: Shift[]) => {
        setErrorMessage(null);
        let currentShifts = [...shifts];
        const MIN_TRANSFERABLE_HOURS = 1 / 60; // 1 minute

        // Process shifts sequentially
        for (const shift of selectedShifts) {
            // Skip already filled shifts if needed, but user might want to retry error ones.
            if (shift.fillStatus === 'success') continue;
            if (shift.totalHours < MIN_TRANSFERABLE_HOURS) {
                currentShifts = updateShiftStatus(currentShifts, shift, 'error', 'Skipped: less than 1 minute');
                setShifts(currentShifts);
                continue;
            }

            // Parse times before passing to script
            const startObj = parseTime(shift.startTime);
            const endObj = parseTime(shift.endTime);
            if (!startObj || !endObj) {
                currentShifts = updateShiftStatus(currentShifts, shift, 'error', `Invalid time format: ${shift.startTime} - ${shift.endTime}`);
                setShifts(currentShifts);
                continue;
            }

            // If the exact shift already exists in JobX, mark as success and skip re-submission.
            const existingCheck = await execute(checkExistingShiftEntry, [shift.date, startObj, endObj], 'MAIN');
            if (existingCheck?.result?.exists) {
                currentShifts = updateShiftStatus(currentShifts, shift, 'success', existingCheck.result.message || 'Already filled');
                setShifts(currentShifts);
                continue;
            }

            const result = await execute(fillShiftRow, [shift.date, startObj, endObj], 'MAIN');

            if (result?.result && !result.result.success) {
                // Update shift with error
                const msg = result.result.debug ? `${result.result.message} (${result.result.debug})` : result.result.message;

                currentShifts = updateShiftStatus(currentShifts, shift, 'error', msg);
                setShifts(currentShifts);
                continue;
            } else if (!result?.result) {
                setErrorMessage('Execution failed.');
                break;
            }

            await new Promise(r => setTimeout(r, SHIFT_SAVE_DELAY_MS));

            let loaded = false;
            for (let i = 0; i < MAX_RELOAD_ATTEMPTS; i++) {
                await new Promise(r => setTimeout(r, PAGE_RELOAD_CHECK_INTERVAL_MS));
                // Check if table exists again
                const check = await execute(checkTableExists);
                if (check?.result) { loaded = true; break; }
            }

            if (!loaded) {
                setErrorMessage(`Timeout waiting for reload after saving shift on ${shift.date}`);
                currentShifts = updateShiftStatus(currentShifts, shift, 'error', 'Timeout waiting for reload');
                setShifts(currentShifts);
                break; // Stop on timeout
            }

            // Check for Validation Errors on the new page
            const validationCheck = await execute(checkValidationErrors, [], 'MAIN');
            if (validationCheck?.result && validationCheck.result.hasError) {
                currentShifts = updateShiftStatus(currentShifts, shift, 'error', validationCheck.result.message || 'Validation Error');
                setShifts(currentShifts);
                continue;
            }

            // Mark as success
            currentShifts = updateShiftStatus(currentShifts, shift, 'success', 'Filled');
            setShifts(currentShifts);
        }
    };

    const handleDeleteShift = (shiftToDelete: Shift) => {
        setShifts(shifts.filter(s => s !== shiftToDelete));
    };

    const handleEditShift = (shiftToEdit: Shift) => {
        const index = shifts.indexOf(shiftToEdit);
        if (index !== -1) {
            setEditingShiftIndex(index);
            setActiveJobTitle(shiftToEdit.jobTitle);
            setStep('manual-entry');
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
                        setEditingShiftIndex(null);
                        setStep('manual-entry');
                    }}
                    availableJobs={availableJobs}
                    onFetchJobs={onFetchJobs}
                    onAutoFill={handleAutoFill}
                    onImportMore={onExit}
                    isRandomMode={isRandomMode}
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
                        const shiftDay = toDayNumber(s.date);
                        const startDay = toDayNumber(activeTimesheet.startDate);
                        const endDay = toDayNumber(activeTimesheet.endDate);

                        if (shiftDay === null || startDay === null || endDay === null) return false;
                        return shiftDay >= startDay && shiftDay <= endDay;
                    })}
                    jobTitle={activeJobTitle || 'Unknown Job'}
                    onBack={handleBackFromDetail}
                    onAddShift={() => {
                        setEditingShiftIndex(null);
                        setStep('manual-entry');
                    }}
                    onAddShifts={(newShifts) => setShifts([...shifts, ...newShifts])}
                    onTransferShifts={handleTransferShifts}
                    onDeleteShift={handleDeleteShift}
                    onEditShift={handleEditShift}
                    autoOpenGenerator={isRandomMode}
                />
            )}

            {step === 'manual-entry' && (
                <ManualEntry
                    onBack={() => {
                        if (activeTimesheet) setStep('timesheet-detail');
                        else setStep('job-matching');
                    }}
                    onShiftAdded={(shift) => {
                        if (editingShiftIndex !== null) {
                            // Update existing
                            const updated = [...shifts];
                            updated[editingShiftIndex] = shift;
                            setShifts(updated);
                            setEditingShiftIndex(null);
                        } else {
                            // Add new
                            setShifts([...shifts, shift]);
                        }

                        if (activeTimesheet) setStep('timesheet-detail');
                        else setStep('job-matching');
                    }}
                    preselectedJobTitle={activeTimesheet ? (activeJobTitle || undefined) : undefined}
                    initialShift={editingShiftIndex !== null ? shifts[editingShiftIndex] : undefined}
                />
            )}
        </div>
    );
};

export default JobXWorkflow;
