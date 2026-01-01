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

            {shifts.length > 0 && (
                <ShiftList
                    shifts={shifts}
                    onAddManualShift={() => setStep('manual-entry')}
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
