import { Wand2, Plus, FileText, Calendar } from 'lucide-react';
import { useState } from 'react';

interface SourceSelectionProps {
    onSelectType: (type: 'import-instructions' | 'manual-entry' | 'import-whentowork' | 'random-schedule') => void;
    onContinue: () => void;
    hasShifts: boolean;
    shiftCount: number;
}

const SourceButton = ({ onClick, logoSrc, FallbackIcon, label, subLabel, colorClass, borderClass }: any) => {
    const [imgError, setImgError] = useState(false);

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg ${borderClass} hover:shadow-md transition-all group`}
        >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                {!imgError ? (
                    <img
                        src={logoSrc}
                        alt={label}
                        className="w-6 h-6 object-contain"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <FallbackIcon size={20} className={colorClass} />
                )}
            </div>
            <div className={`font-bold ${colorClass} text-xs mb-0.5`}>{label}</div>
            <span className="text-[10px] text-gray-500">{subLabel}</span>
        </button>
    );
};

const SourceSelection: React.FC<SourceSelectionProps> = ({ onSelectType, onContinue, hasShifts, shiftCount }) => {
    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 mb-4 transition-all">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Add Shifts From</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                    onClick={() => onSelectType('random-schedule')}
                    className="col-span-2 flex items-center justify-center p-4 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-300 hover:shadow-md transition-all group gap-3"
                >
                    <div className="p-2 bg-purple-200 rounded-full text-purple-700 group-hover:scale-110 transition-transform">
                        <Wand2 size={24} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-purple-700 text-lg">Random Schedule</div>
                        <span className="text-xs text-purple-600">Auto-fill hours for a period</span>
                    </div>
                </button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-2">
                <SourceButton
                    onClick={() => onSelectType('import-instructions')}
                    logoSrc="/logos/connectteam.png"
                    FallbackIcon={FileText}
                    label="ConnectTeam"
                    subLabel="PDF Upload"
                    colorClass="text-blue-600"
                    borderClass="hover:bg-blue-50 hover:border-blue-300"
                />
                <SourceButton
                    onClick={() => onSelectType('import-whentowork')}
                    logoSrc="/logos/whentowork.png"
                    FallbackIcon={Calendar}
                    label="WhenToWork"
                    subLabel="PDF Upload"
                    colorClass="text-green-600"
                    borderClass="hover:bg-green-50 hover:border-green-300"
                />

                <button
                    onClick={() => onSelectType('manual-entry')}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all group"
                >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 shadow-sm border border-gray-200 group-hover:scale-110 transition-transform">
                        <Plus size={20} className="text-gray-600" />
                    </div>
                    <div className="font-bold text-gray-700 text-xs mb-0.5">Manual</div>
                    <span className="text-[10px] text-gray-500">Single Shift</span>
                </button>
            </div>
            {hasShifts && (
                <div className="mt-4 text-center">
                    <button onClick={onContinue} className="text-blue-600 hover:underline text-sm font-medium">
                        Continue to Job Matching ({shiftCount} shifts)
                    </button>
                </div>
            )}
        </div>
    );
};

export default SourceSelection;
