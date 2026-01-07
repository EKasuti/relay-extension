import { Wand2 } from 'lucide-react';

interface SourceSelectionProps {
    onSelectType: (type: 'import-instructions' | 'manual-entry' | 'import-whentowork' | 'random-schedule') => void;
    onContinue: () => void;
    hasShifts: boolean;
    shiftCount: number;
}

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
                <button
                    onClick={() => onSelectType('import-instructions')}
                    className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                    <div className="font-bold text-blue-600 mb-1 group-hover:scale-105 transition-transform">ConnectTeam</div>
                    <span className="text-xs text-gray-500">Import PDF</span>
                </button>
                <button
                    onClick={() => onSelectType('import-whentowork')}
                    className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 hover:shadow-sm transition-all group"
                >
                    <div className="font-bold text-green-600 mb-1 group-hover:scale-105 transition-transform">WhenToWork</div>
                    <span className="text-xs text-gray-500">Import PDF</span>
                </button>
                <button
                    onClick={() => onSelectType('manual-entry')}
                    className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                    <div className="font-bold text-gray-700 mb-1">Manual</div>
                    <span className="text-xs text-gray-500">Add Single Shift</span>
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
