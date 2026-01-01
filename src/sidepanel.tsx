import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import relayLogo from '/relay.svg'
import type { Shift } from './types'
import SourceSelection from './components/SourceSelection'
import Instructions from './components/Instructions'
import Upload from './components/Upload'
import ManualEntry from './components/ManualEntry'
import ShiftList from './components/ShiftList'

function Sidepanel() {
    const [shifts, setShifts] = useState<Shift[]>([]);

    // Navigation State
    const [step, setStep] = useState<'select-source' | 'import-instructions' | 'import-upload' | 'job-matching' | 'manual-entry'>('select-source');
    const [availableJobs, setAvailableJobs] = useState<string[]>([]);

    const fetchJobXJobs = async () => {
        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            alert('Chrome APIs not available');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) return;

        // Check URL
        if (!tab.url?.includes('dartmouth.studentemployment.ngwebsolutions.com/jobx_userdashboard.aspx')) {
            alert('You need to be on the Dartmouth JobX dashboard to import hires. A new tab will be opened for you.');
            await chrome.tabs.create({ url: 'https://dartmouth.studentemployment.ngwebsolutions.com/jobx_userdashboard.aspx' });
            return;
        }

        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async () => {
                    const maxAttempts = 10;
                    const intervalMs = 500;

                    const sleep = (ms: number) =>
                        new Promise<void>(resolve => setTimeout(resolve, ms));

                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Hires'));
                        const table = document.getElementById('currHireTable');

                        if (h2 && table) {
                            const jobTitles: string[] = [];
                            const rows = table.querySelectorAll('tbody tr');

                            rows.forEach(row => {
                                const firstTh = row.querySelector('th');
                                if (firstTh && firstTh.textContent) {
                                    jobTitles.push(firstTh.textContent.trim());
                                }
                            });

                            return { success: true, data: jobTitles };
                        }

                        await sleep(intervalMs);
                    }

                    // After retries, still no required elements
                    const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Hires'));
                    if (!h2) {
                        return { success: false, message: 'Could not find "Hires" section (timed out waiting for page to load)' };
                    }

                    const table = document.getElementById('currHireTable');
                    if (!table) {
                        return { success: false, message: 'Table #currHireTable not found (timed out waiting for page to load)' };
                    }

                    return { success: false, message: 'Unknown error while reading JobX hires table' };
                }
            });

            const result = results[0]?.result;
            if (result && result.success && Array.isArray(result.data)) {
                setAvailableJobs(result.data);
            } else {
                alert(result?.message || 'Failed to scrape data');
            }
        } catch (error) {
            console.error('Script execution failed:', error);
            alert('Failed to read from page. Make sure you are on the correct tab.');
        }
    };

    const handleShiftsParsed = (parsedShifts: Shift[]) => {
        setShifts(prev => [...prev, ...parsedShifts]);
        setStep('job-matching');
    };

    const handleShiftAdded = (newShift: Shift) => {
        setShifts(prev => [...prev, newShift]);
    };

    return (
        <div className="flex flex-col items-center p-4 min-h-screen bg-gray-50 font-sans">
            <h1 className="text-xl font-bold mb-4 text-blue-600 tracking-tight">Relay Sidepanel</h1>
            <div className="mb-6">
                <img src={relayLogo} className="h-12 w-12 hover:scale-110 transition-transform drop-shadow-sm" alt="Relay logo" />
            </div>

            {step === 'select-source' && (
                <SourceSelection
                    onSelectType={setStep}
                    onContinue={() => setStep('job-matching')}
                    hasShifts={shifts.length > 0}
                    shiftCount={shifts.length}
                />
            )}

            {step === 'import-instructions' && (
                <Instructions
                    onBack={() => setStep('select-source')}
                    onNext={() => setStep('import-upload')}
                />
            )}

            {step === 'import-upload' && (
                <Upload
                    onBack={() => setStep('import-instructions')}
                    onShiftsParsed={handleShiftsParsed}
                />
            )}

            {step === 'manual-entry' && (
                <ManualEntry
                    onBack={() => setStep(shifts.length > 0 ? 'job-matching' : 'select-source')}
                    onShiftAdded={handleShiftAdded}
                />
            )}

            {step === 'job-matching' && shifts.length > 0 && (
                <ShiftList
                    shifts={shifts}
                    onAddManualShift={() => setStep('manual-entry')}
                    availableJobs={availableJobs}
                    onFetchJobs={fetchJobXJobs}
                />
            )}
        </div>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Sidepanel />
    </StrictMode>,
)
