import React, { useState } from 'react';
import type { Shift } from '../types';

interface ManualEntryProps {
    onBack: () => void;
    onShiftAdded: (shift: Shift) => void;
    preselectedJobTitle?: string;
    initialShift?: Shift;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onBack, onShiftAdded, preselectedJobTitle, initialShift }) => {
    // Helper to convert "9:00am" or "9:00" to "09:00" (24h) for input[type="time"]
    const to24h = (timeStr: string) => {
        if (!timeStr) return '';
        // If already in HH:MM format (and maybe seconds), just return first 5 chars
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
            // Ensure padding if needed? "9:00" -> "09:00"? input usually handles 9:00 but 09:00 is safer.
            const parts = timeStr.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1]}`;
        }

        // Parse "9:30am", "10:00 PM", etc. using our utils logic or custom regex relative to formatTime in generator
        const lower = timeStr.toLowerCase().trim();
        const match = lower.match(/(\d{1,2}):(\d{2})\s*([ap]m)/);
        if (match) {
            let h = parseInt(match[1]);
            const m = match[2];
            const p = match[3]; // am or pm

            if (p === 'pm' && h < 12) h += 12;
            if (p === 'am' && h === 12) h = 0;

            return `${h.toString().padStart(2, '0')}:${m}`;
        }
        return timeStr; // Fallback
    };

    const [manualShift, setManualShift] = useState({
        date: initialShift ? initialShift.date.split('T')[0] : '',
        startTime: initialShift ? to24h(initialShift.startTime) : '',
        endTime: initialShift ? to24h(initialShift.endTime) : '',
        jobTitle: initialShift ? initialShift.jobTitle : (preselectedJobTitle || '')
    });
    const [status, setStatus] = useState<string>('');

    const handleManualAdd = () => {
        if (!manualShift.date || !manualShift.startTime || !manualShift.endTime) {
            setStatus('Please fill in all required fields.');
            return;
        }

        // Calculate total hours
        const [startH, startM] = manualShift.startTime.split(':').map(Number);
        const [endH, endM] = manualShift.endTime.split(':').map(Number);

        // Basic validation of parsed times
        if (
            Number.isNaN(startH) || Number.isNaN(startM) ||
            Number.isNaN(endH) || Number.isNaN(endM)
        ) {
            setStatus('Invalid time format. Please use HH:MM.');
            return;
        }

        const startTotal = startH + startM / 60;
        const endTotal = endH + endM / 60;
        const isOvernight = endTotal <= startTotal;

        let total = endTotal - startTotal;
        if (isOvernight) {
            total += 24;
        }

        if (total <= 0 || total > 24) {
            setStatus('Invalid shift duration. Please check start and end times.');
            return;
        }
        const newShift: Shift = {
            // Append T00:00:00 to ensure local time interpretation if parsed by Date
            date: manualShift.date.includes('T') ? manualShift.date : `${manualShift.date}T00:00:00`,
            startTime: manualShift.startTime,
            endTime: manualShift.endTime,
            totalHours: parseFloat(total.toFixed(2)),
            jobTitle: manualShift.jobTitle || 'Manual Entry',
            isMigrated: false
        };

        onShiftAdded(newShift);
        if (initialShift) {
            onBack();
        } else if (!preselectedJobTitle) {
            setManualShift({ date: '', startTime: '', endTime: '', jobTitle: '' });
        } else {
            setManualShift(prev => ({ ...prev, date: '', startTime: '', endTime: '' }));
        }
        setStatus('Shift added manually.');
    };

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 mb-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-800">{initialShift ? 'Edit Shift' : 'Manual Entry'}</h2>
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">Back</button>
            </div>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Job Title *</label>
                    <input
                        type="text"
                        value={manualShift.jobTitle}
                        onChange={e => setManualShift({ ...manualShift, jobTitle: e.target.value })}
                        disabled={!!preselectedJobTitle}
                        className={`border border-gray-300 rounded w-full p-2 text-sm outline-none transition-all ${preselectedJobTitle ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            }`}
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
                    {initialShift ? 'Save Changes' : 'Add Shift'}
                </button>
                {status && <div className="mt-2 text-sm text-gray-600">{status}</div>}
            </div>
        </div>
    );
};

export default ManualEntry;
