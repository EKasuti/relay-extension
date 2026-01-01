import React from 'react';
import type { Timesheet, Shift } from '../types';

interface TimesheetDetailProps {
    timesheet: Timesheet;
    shifts: Shift[];
    jobTitle: string;
    onBack: () => void;
    onAddShift: () => void;
}

const TimesheetDetail: React.FC<TimesheetDetailProps> = ({ timesheet, shifts, jobTitle, onBack, onAddShift }) => {
    return (
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 border-b pb-4">
                <button
                    onClick={onBack}
                    className="mb-2 text-sm text-blue-600 hover:text-blue-800 flex items-center font-bold"
                >
                    ← Back to Periods
                </button>
                <h2 className="text-lg font-bold text-gray-800">{jobTitle}</h2>
                <div className="text-sm text-gray-500 mt-1">
                    Pay Period: <span className="font-medium text-gray-700">{timesheet.payPeriodString}</span>
                </div>
            </div>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Shifts ({shifts.length})</h3>

                {shifts.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                        No shifts for this period yet.
                    </div>
                ) : (
                    shifts.map((shift, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                            <div>
                                <div className="font-medium text-gray-800">{new Date(shift.date).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{shift.startTime} - {shift.endTime}</div>
                                <div className="text-xs text-gray-500 font-mono">{shift.totalHours} hrs</div>
                            </div>
                            <div className="flex flex-col items-end">
                                {/* Status Indicator */}
                                {shift.fillStatus === 'success' && (
                                    <span className="text-green-600 font-bold text-xs flex items-center">
                                        Filled
                                    </span>
                                )}
                                {shift.fillStatus === 'error' && (
                                    <span className="text-red-500 font-bold text-xs flex items-center" title={shift.fillMessage}>
                                        Error
                                    </span>
                                )}
                                {(!shift.fillStatus || shift.fillStatus === 'pending') && (
                                    <span className="text-gray-400 text-xs flex items-center">
                                        Pending
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={onAddShift}
                className="w-full py-2 px-4 mb-3 border-2 border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 font-bold transition-colors flex justify-center items-center gap-2"
            >
                + Add Shift
            </button>
        </div>
    );
};

export default TimesheetDetail;
