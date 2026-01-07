import { useState, useEffect } from 'react';
import type { Shift } from '../types';
import { generateRandomShifts } from '../utils/randomShiftGenerator';
import { Wand2, X, Calendar, CheckSquare, Square } from 'lucide-react';


interface RandomShiftGeneratorProps {
    startDate: string; // ISO Date String
    endDate: string;   // ISO Date String
    jobTitle: string;
    onGenerate: (shifts: Shift[]) => void;
    onCancel: () => void;
}

export default function RandomShiftGenerator({ startDate, endDate, jobTitle, onGenerate, onCancel }: RandomShiftGeneratorProps) {
    // Config State
    const [targetHours, setTargetHours] = useState<number>(10);
    const [minShiftHours, setMinShiftHours] = useState<number>(2);
    const [maxShiftHours, setMaxShiftHours] = useState<number>(4);

    // Date Selection State
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

    const [error, setError] = useState<string | null>(null);

    // Initialize dates on mount
    useEffect(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates: string[] = [];

        // Normalize time to noon to avoid DST issues when iterating
        const current = new Date(start);
        current.setHours(12, 0, 0, 0);
        const endTarget = new Date(end);
        endTarget.setHours(12, 0, 0, 0);

        while (current <= endTarget) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        setAvailableDates(dates);
        // Default select all
        setSelectedDates(new Set(dates));
    }, [startDate, endDate]);

    const toggleDate = (dateIso: string) => {
        const newSet = new Set(selectedDates);
        if (newSet.has(dateIso)) {
            newSet.delete(dateIso);
        } else {
            newSet.add(dateIso);
        }
        setSelectedDates(newSet);
    };

    const toggleAll = () => {
        if (selectedDates.size === availableDates.length) {
            setSelectedDates(new Set());
        } else {
            setSelectedDates(new Set(availableDates));
        }
    };

    const generateShifts = () => {
        setError(null);

        const result = generateRandomShifts({
            targetHours,
            minShiftHours,
            maxShiftHours,
            selectedDates: Array.from(selectedDates),
            jobTitle
        });

        if (!result.success || !result.shifts) {
            setError(result.error || 'Failed to generate shifts');
            return;
        }

        onGenerate(result.shifts);
    };

    // Helper to format date label
    const formatDateLabel = (isoDate: string) => {
        const d = new Date(isoDate + 'T12:00:00'); // Force noon to avoid timezone shift
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-2 mb-4 text-purple-600 flex-shrink-0">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Wand2 size={24} />
                    </div>
                    <h2 className="text-xl font-bold">Random Schedule</h2>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                    {/* Target Hours */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Total Hours Needed
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={targetHours}
                                onChange={e => setTargetHours(parseFloat(e.target.value))}
                                className="w-full border rounded-lg p-2 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                min="1"
                                step="0.5"
                            />
                            <span className="text-gray-500 font-medium">hrs</span>
                        </div>
                    </div>

                    {/* Shift Duration Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Shift</label>
                            <input
                                type="number"
                                value={minShiftHours}
                                onChange={e => setMinShiftHours(parseFloat(e.target.value))}
                                className="w-full border rounded p-2 text-sm"
                                min="0.5"
                                step="0.5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Shift</label>
                            <input
                                type="number"
                                value={maxShiftHours}
                                onChange={e => setMaxShiftHours(parseFloat(e.target.value))}
                                className="w-full border rounded p-2 text-sm"
                                min="0.5"
                                step="0.5"
                            />
                        </div>
                    </div>

                    {/* Date Selection List */}
                    <div className="border rounded-lg overflow-hidden flex flex-col h-60">
                        <div className="bg-gray-100 p-2 flex justify-between items-center border-b border-gray-200">
                            <div className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                                <Calendar size={14} /> Select Dates
                            </div>
                            <button
                                onClick={toggleAll}
                                className="text-xs text-blue-600 font-bold hover:underline"
                            >
                                {selectedDates.size === availableDates.length ? 'None' : 'All'}
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-white">
                            {availableDates.map(date => {
                                const isSelected = selectedDates.has(date);
                                return (
                                    <div
                                        key={date}
                                        onClick={() => toggleDate(date)}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}
                                    >
                                        <div className={`text-blue-600 ${isSelected ? 'opacity-100' : 'opacity-30'}`}>
                                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>
                                        <div className={`text-sm font-medium ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                                            {formatDateLabel(date)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg animate-pulse">
                            {error}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3 mt-auto flex-shrink-0">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={generateShifts}
                        className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2"
                    >
                        <Wand2 size={18} />
                        Generate
                    </button>
                </div>
            </div>
        </div>
    );
}
