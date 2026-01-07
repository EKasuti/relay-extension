import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import relayLogo from '/logo.png'
import type { Shift } from './types'
import SourceSelection from './components/SourceSelection'
import Instructions from './components/Instructions'
import Upload from './components/Upload'
import ManualEntry from './components/ManualEntry'
import JobXWorkflow from './components/JobXWorkflow'
import { scrapeJobTitles } from './utils/jobx'
import { Globe, RotateCcw } from 'lucide-react'

function Sidepanel() {
    const [shifts, setShifts] = useState<Shift[]>([]);

    // Navigation State
    const [step, setStep] = useState<
        'select-source' |
        'import-instructions' |
        'import-whentowork' |
        'import-whentowork-upload' |
        'import-upload' |
        'job-matching' |
        'manual-entry'
    >('select-source');

    // Global State for JobX
    const [availableJobs, setAvailableJobs] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isRandomMode, setIsRandomMode] = useState(false);

    const handleOpenWebsite = () => {
        window.open('https://relay-extension-seven.vercel.app/', '_blank');
    };

    const handleRestart = () => {
        if (confirm('Are you sure you want to restart? All imported shifts will be cleared.')) {
            setShifts([]);
            setStep('select-source');
            setErrorMessage(null);
            setAvailableJobs([]);
            setIsRandomMode(false);
        }
    };

    const fetchJobXJobs = async () => {
        setErrorMessage(null);
        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            setErrorMessage('Chrome APIs not available');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        // Check URL
        if (!tab.url?.includes('dartmouth.studentemployment.ngwebsolutions.com/jobx_userdashboard.aspx')) {
            if (confirm('You need to be on the Dartmouth JobX dashboard to import hires. Go there now?')) {
                await chrome.tabs.create({ url: 'https://dartmouth.studentemployment.ngwebsolutions.com/jobx_userdashboard.aspx' });
            }
            return;
        }

        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: scrapeJobTitles
            });

            const result = results[0]?.result;
            if (result && result.success && Array.isArray(result.data)) {
                setAvailableJobs(result.data);
            } else {
                setErrorMessage(result?.message || 'Failed to scrape data');
            }
        } catch (err) {
            console.error('Script execution failed:', err);
            setErrorMessage('Failed to read from page. Make sure you are on the correct tab.');
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
        <div className="flex flex-col items-center p-4 min-h-screen bg-gray-50 font-sans relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <button
                    onClick={handleOpenWebsite}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Go to Relay Website"
                >
                    <Globe size={20} />
                </button>
                <button
                    onClick={handleRestart}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Restart / Clear All"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            <h1 className="text-xl font-bold mb-4 text-blue-600 tracking-tight">Relay Sidepanel</h1>
            <div className="mb-6">
                <img src={relayLogo} className="h-12 w-12 hover:scale-110 transition-transform drop-shadow-sm" alt="Relay logo" />
            </div>

            {errorMessage && (
                <div className="w-full max-w-sm mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                    <span className="font-bold">Error:</span> {errorMessage}
                    <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold">×</button>
                </div>
            )}

            {step === 'select-source' && (
                <SourceSelection
                    onSelectType={(newStep) => {
                        if (newStep === 'random-schedule') {
                            setIsRandomMode(true);
                            setStep('job-matching');
                        } else {
                            setIsRandomMode(false);
                            setStep(newStep);
                        }
                    }}
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

            {step === 'import-whentowork' && (
                <Instructions
                    onBack={() => setStep('select-source')}
                    onNext={() => setStep('import-whentowork-upload')}
                    source="whentowork"
                />
            )}

            {step === 'import-whentowork-upload' && (
                <Upload
                    onBack={() => setStep('import-whentowork')}
                    onShiftsParsed={handleShiftsParsed}
                    source="whentowork"
                />
            )}

            {/* Global Manual Entry (Before JobX Workflow) */}
            {step === 'manual-entry' && (
                <ManualEntry
                    onBack={() => setStep(shifts.length > 0 ? 'job-matching' : 'select-source')}
                    onShiftAdded={(shift) => {
                        handleShiftAdded(shift);
                    }}
                />
            )}

            {step === 'job-matching' && (
                <JobXWorkflow
                    shifts={shifts}
                    setShifts={setShifts}
                    availableJobs={availableJobs}
                    onFetchJobs={fetchJobXJobs}
                    onExit={() => setStep('select-source')}
                    isRandomMode={isRandomMode}
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
