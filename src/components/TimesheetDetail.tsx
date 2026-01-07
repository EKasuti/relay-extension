import React, { useState, useEffect } from 'react';
import type { Timesheet, Shift } from '../types';

interface TimesheetDetailProps {
    timesheet: Timesheet;
    shifts: Shift[];
    jobTitle: string;
    onBack: () => void;
    onAddShift: () => void;
    onAddShifts?: (shifts: Shift[]) => void;
    onTransferShifts?: (shifts: Shift[]) => void;
    autoOpenGenerator?: boolean;
    onDeleteShift?: (shift: Shift) => void;
    onEditShift?: (shift: Shift) => void;
}

import { Wand2, Pencil, Trash2 } from 'lucide-react';
import RandomShiftGenerator from './RandomShiftGenerator';

const TimesheetDetail: React.FC<TimesheetDetailProps> = ({ timesheet, shifts, jobTitle, onBack, onAddShift, onAddShifts, onTransferShifts, autoOpenGenerator, onDeleteShift, onEditShift }) => {
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [showGenerator, setShowGenerator] = useState(false);

    // Auto-open generator if requested and no shifts exist yet
    useEffect(() => {
        if (autoOpenGenerator && shifts.length === 0) {
            setShowGenerator(true);
        }
    }, [autoOpenGenerator, shifts.length]);

    const toggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    // Optimize: Pre-calculate selectable indices to avoid O(n^2) operations in render and handlers
    const selectableIndices = shifts
        .map((s, i) => (s.fillStatus !== 'success' ? i : -1))
        .filter(i => i !== -1);

    const allSelectableSelected = selectableIndices.length > 0 && selectableIndices.every(i => selectedIndices.has(i));

    const toggleAll = () => {
        if (allSelectableSelected) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(selectableIndices));
        }
    };

    const handleTransfer = () => {
        if (!onTransferShifts) return;
        const selected = shifts.filter((_, i) => selectedIndices.has(i));
        onTransferShifts(selected);
    };

    return (
        <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md mx-auto relative">
            {showGenerator && (
                <RandomShiftGenerator
                    startDate={timesheet.startDate}
                    endDate={timesheet.endDate}
                    jobTitle={jobTitle}
                    onGenerate={(generated) => {
                        setShowGenerator(false);
                        // Trigger callback
                        if (onAddShifts) {
                            onAddShifts(generated);
                        }
                    }}
                    onCancel={() => setShowGenerator(false)}
                />
            )}

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
                <div className="flex justify-between items-center bg-gray-100 p-2 rounded">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Shifts ({shifts.length})</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={allSelectableSelected}
                            onChange={toggleAll}
                            disabled={shifts.every(s => s.fillStatus === 'success')}
                        />
                        <span className="text-xs text-gray-500">Select All</span>
                    </div>
                </div>

                {shifts.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                        No shifts for this period yet.
                    </div>
                ) : (
                    shifts.map((shift, idx) => (
                        <div key={idx} className={`flex gap-3 items-center p-3 rounded border transition-colors ${shift.fillStatus === 'success'
                            ? 'bg-green-50 border-green-200 opacity-75'
                            : selectedIndices.has(idx)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-100 bg-gray-50'
                            }`}>
                            <input
                                type="checkbox"
                                className={`h-4 w-4 ${shift.fillStatus === 'success' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 cursor-pointer'}`}
                                checked={selectedIndices.has(idx) || shift.fillStatus === 'success'}
                                onChange={() => shift.fillStatus !== 'success' && toggleSelection(idx)}
                                disabled={shift.fillStatus === 'success'}
                            />
                            <div className="flex-1 flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-gray-800">{new Date(shift.date).toLocaleDateString()}</div>
                                    <div className="text-xs text-gray-500">{shift.startTime} - {shift.endTime}</div>
                                    <div className="text-xs text-gray-500 font-mono">{shift.totalHours} hrs</div>
                                    {/* Inline Alert for Error */}
                                    {shift.fillStatus === 'error' && (
                                        <div className="text-xs text-red-600 mt-1">{shift.fillMessage}</div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end">
                                    {/* Status Indicator */}
                                    {shift.fillStatus === 'success' && (
                                        <span className="text-green-700 font-bold text-xs flex items-center bg-green-100 px-2 py-1 rounded-full">
                                            Filled
                                        </span>
                                    )}
                                    {shift.fillStatus === 'error' && (
                                        <span className="text-red-600 font-bold text-xs flex items-center bg-red-100 px-2 py-1 rounded-full" title={shift.fillMessage}>
                                            Error
                                        </span>
                                    )}
                                    {(!shift.fillStatus || shift.fillStatus === 'pending') && (
                                        <div className="flex items-center gap-1">
                                            {onEditShift && (
                                                <button
                                                    onClick={() => onEditShift(shift)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit Shift"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {onDeleteShift && (
                                                <button
                                                    onClick={() => onDeleteShift(shift)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete Shift"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedIndices.size > 0 && (
                <button
                    onClick={handleTransfer}
                    className="w-full py-2 px-4 mb-3 bg-green-600 text-white rounded hover:bg-green-700 font-bold transition-colors flex justify-center items-center shadow-md"
                >
                    Transfer {selectedIndices.size} Shift{selectedIndices.size !== 1 ? 's' : ''}
                </button>
            )}

            <div className="flex gap-2">
                <button
                    onClick={() => setShowGenerator(true)}
                    className="flex-1 py-2 px-3 border border-purple-200 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 font-bold transition-colors flex justify-center items-center gap-2"
                >
                    <Wand2 size={16} />
                    Auto-Generate
                </button>
                <button
                    onClick={onAddShift}
                    className="flex-1 py-2 px-3 border-2 border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 font-bold transition-colors flex justify-center items-center gap-2"
                >
                    + Add Manual
                </button>
            </div>
        </div>
    );
};

export default TimesheetDetail;
