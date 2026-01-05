import React from 'react';
import type { Timesheet, Shift } from '../types';

interface TimesheetSelectionProps {
    timesheets: Timesheet[];
    shifts: Shift[];
    onSelect: (timesheet: Timesheet) => void;
    onBack: () => void;
}

const TimesheetSelection: React.FC<TimesheetSelectionProps> = ({ timesheets, shifts, onSelect, onBack }) => {
    // Helper to calculate overlap count (for user info)
    const getShiftCountForRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return shifts.filter(s => {
            const d = new Date(s.date);
            return d >= startDate && d <= endDate;
        }).length;
    };

    return (
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Select Pay Period</h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
                Choose the pay period to fill. Shifts outside this range will be skipped for now.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {timesheets.map((ts, idx) => {
                    const matchCount = getShiftCountForRange(ts.startDate, ts.endDate);
                    const isSuggested = matchCount > 0 && ts.status === 'Never Started';

                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(ts)}
                            className={`w-full p-3 rounded border text-left flex justify-between items-center transition-colors ${isSuggested
                                ? 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <div>
                                <div className="font-semibold text-gray-800">{ts.payPeriodString}</div>
                                <div className={`text-xs ${ts.status === 'Never Started' ? 'text-green-600 font-bold' : 'text-gray-500'
                                    }`}>
                                    Status: {ts.status}
                                </div>
                            </div>
                            {matchCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    {matchCount} shifts
                                </span>
                            )}
                        </button>
                    );
                })}

                {timesheets.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                        No timesheets found.
                    </div>
                )}
            </div>

            <button
                onClick={onBack}
                className="w-full mt-6 py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold transition-colors"
            >
                Back
            </button>
        </div>
    );
};

export default TimesheetSelection;
