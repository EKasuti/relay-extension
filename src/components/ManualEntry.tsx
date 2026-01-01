import React, { useState } from 'react';
import type { Shift } from '../types';

interface ManualEntryProps {
    onBack: () => void;
    onShiftAdded: (shift: Shift) => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onBack, onShiftAdded }) => {
    const [manualShift, setManualShift] = useState({
        date: '',
        startTime: '',
        endTime: '',
        type: ''
    });
    const [status, setStatus] = useState<string>('');

    const handleManualAdd = () => {
        if (!manualShift.date || !manualShift.startTime || !manualShift.endTime) {
            setStatus('Please fill in all required fields.');
            return;
        }

        // Calculate total hours
        // Simple 24h format assumption for manual entry or input type="time"
        const [startH, startM] = manualShift.startTime.split(':').map(Number);
        const [endH, endM] = manualShift.endTime.split(':').map(Number);

        let total = (endH + endM / 60) - (startH + startM / 60);
        if (total < 0) total += 24; // handles overnight

        const newShift: Shift = {
            date: manualShift.date,
            startTime: manualShift.startTime,
            endTime: manualShift.endTime,
            totalHours: parseFloat(total.toFixed(2)),
            jobTitle: manualShift.type || 'Manual Entry',
            isMigrated: false
        };

        onShiftAdded(newShift);
        setManualShift({ date: '', startTime: '', endTime: '', type: '' });
        setStatus('Shift added manually.');
    };

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 mb-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Manual Entry</h2>
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">Back</button>
            </div>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Job Title *</label>
                    <input
                        type="text"
                        value={manualShift.type}
                        onChange={e => setManualShift({ ...manualShift, type: e.target.value })}
                        className="border border-gray-300 rounded w-full p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. Baker Desk"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                    <input
                        type="date"
                        value={manualShift.date}
                        onChange={e => setManualShift({ ...manualShift, date: e.target.value })}
                        className="border border-gray-300 rounded w-full p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time *</label>
                        <input
                            type="time"
                            value={manualShift.startTime}
                            onChange={e => setManualShift({ ...manualShift, startTime: e.target.value })}
                            className="border border-gray-300 rounded w-full p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">End Time *</label>
                        <input
                            type="time"
                            value={manualShift.endTime}
                            onChange={e => setManualShift({ ...manualShift, endTime: e.target.value })}
                            className="border border-gray-300 rounded w-full p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <button
                    onClick={handleManualAdd}
                    className="w-full mt-2 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Add Shift
                </button>
                {status && <div className="mt-2 text-sm text-gray-600">{status}</div>}
            </div>
        </div>
    );
};

export default ManualEntry;
