import React, { useState } from 'react';
import type { Shift } from '../types';

interface ShiftListProps {
    shifts: Shift[];
}

const ShiftList: React.FC<ShiftListProps & { onAddManualShift: () => void }> = ({ shifts, onAddManualShift }) => {
    const [selectedType, setSelectedType] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const uniqueTypes = ['All', ...new Set(shifts.map(s => s.jobTitle))];

    const filteredShifts = selectedType === 'All'
        ? shifts
        : shifts.filter(s => s.jobTitle === selectedType);

    const sortedShifts = [...filteredShifts].sort((a, b) => {
        return sortOrder === 'asc'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date);
    });

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 overflow-y-auto max-h-96 animate-slideUp">
            <div className="flex flex-col gap-3 mb-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 text-sm">Parsed Shifts ({sortedShifts.length})</h3>
                    <button
                        onClick={onAddManualShift}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium transition-colors"
                    >
                        + Add Shift
                    </button>
                </div>
                <div className="flex justify-between gap-2">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 outline-none flex-grow"
                    >
                        {uniqueTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                        title="Sort by date"
                    >
                        <span>Date</span>
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    </button>
                </div>
            </div>
            <div className="space-y-2">
                {sortedShifts.map((shift, index) => (
                    <div key={index} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
                        <div>
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                {shift.date}
                                <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                    {shift.jobTitle}
                                </span>
                            </div>
                            <div className="text-gray-500 mt-1 text-xs">{shift.startTime} - {shift.endTime}</div>
                        </div>
                        <div className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                            {shift.totalHours.toFixed(2)} hrs
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShiftList;
