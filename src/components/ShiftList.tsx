import React, { useState, useEffect } from 'react';
import type { Shift } from '../types';

interface ShiftListProps {
    shifts: Shift[];
}

const ShiftList: React.FC<ShiftListProps & { onAddManualShift: () => void; availableJobs?: string[]; onFetchJobs?: () => void; onAutoFill?: (jobTitle: string, shiftsToFill: Shift[]) => void }> = ({ shifts, onAddManualShift, availableJobs = [], onFetchJobs, onAutoFill }) => {
    const [selectedType, setSelectedType] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [jobMappings, setJobMappings] = useState<Record<string, string>>({});

    // Load mappings from storage on mount
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['jobMappings'], (result) => {
                if (result.jobMappings) {
                    setJobMappings(result.jobMappings as Record<string, string>);
                }
            });
        }
    }, []);

    // Save mappings to storage whenever they change
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ jobMappings });
        }
    }, [jobMappings]);

    const uniqueTypes = [...new Set(shifts.map(s => s.jobTitle))];
    const uniqueFilterTypes = ['All', ...uniqueTypes];

    const filteredShifts = selectedType === 'All'
        ? shifts
        : shifts.filter(s => s.jobTitle === selectedType);

    const sortedShifts = [...filteredShifts].sort((a, b) => {
        return sortOrder === 'asc'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date);
    });

    const handleMappingChange = (parsedTitle: string, jobXTitle: string) => {
        setJobMappings(prev => ({
            ...prev,
            [parsedTitle]: jobXTitle
        }));
    };

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 overflow-y-auto min-h-[300px] md:min-h-[600px] animate-slideUp">
            <div className="flex flex-col gap-3 mb-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 text-sm">Parsed Shifts ({sortedShifts.length})</h3>
                    <div className="flex gap-2">
                        {onFetchJobs && (
                            <button
                                onClick={onFetchJobs}
                                className={`text-xs px-2 py-1 rounded font-medium transition-colors ${availableJobs.length > 0 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                                title={availableJobs.length > 0 ? `${availableJobs.length} jobs found` : "Fetch jobs from JobX"}
                            >
                                {availableJobs.length > 0 ? '✓ Jobs Linked' : '↻ Sync JobX'}
                            </button>
                        )}
                        <button
                            onClick={onAddManualShift}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium transition-colors"
                        >
                            + Add Shift
                        </button>
                    </div>
                </div>

                {availableJobs.length > 0 && uniqueTypes.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Map Job Titles</h4>
                        <div className="space-y-2">
                            {uniqueTypes.filter(t => t !== 'Manual Entry').map(type => {
                                const mappedJob = jobMappings[type];
                                return (
                                    <div key={type} className="flex items-center justify-between gap-2 text-xs">
                                        <span className="font-medium text-gray-700 truncate max-w-[30%] flex-shrink-0" title={type}>{type}</span>
                                        <span className="text-gray-400">→</span>
                                        <select
                                            value={mappedJob || ''}
                                            onChange={(e) => handleMappingChange(type, e.target.value)}
                                            className="bg-white border border-gray-300 text-gray-900 rounded focus:ring-blue-500 focus:border-blue-500 block p-1 outline-none flex-grow"
                                            aria-label={`Map "${type}" to JobX job title`}
                                        >
                                            <option value="">Select JobX Job...</option>
                                            {availableJobs.map(job => (
                                                <option key={job} value={job}>{job}</option>
                                            ))}
                                        </select>
                                        {onAutoFill && (
                                            <button
                                                onClick={() => mappedJob && onAutoFill(mappedJob, shifts.filter(s => s.jobTitle === type))}
                                                disabled={!mappedJob}
                                                className={`px-2 py-1 rounded font-medium transition-colors ${mappedJob
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                title={mappedJob ? "Auto-fill timesheet for this job" : "Select a job first"}
                                            >
                                                AutoFill
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-between gap-2">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 outline-none flex-grow"
                        aria-label="Filter shifts by job type"
                    >
                        {uniqueFilterTypes.map(type => (
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
                {sortedShifts.map((shift) => {
                    const mappedJob = jobMappings[shift.jobTitle];
                    const shiftKey = `${shift.date}-${shift.startTime}-${shift.endTime}-${shift.jobTitle}`;
                    return (
                        <div key={shiftKey} className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
                            <div>
                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                    {shift.date}
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${mappedJob ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {mappedJob || shift.jobTitle}
                                    </span>
                                </div>
                                <div className="text-gray-500 mt-1 text-xs">{shift.startTime} - {shift.endTime}</div>
                            </div>
                            <div className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                {shift.totalHours.toFixed(2)} hrs
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ShiftList;
