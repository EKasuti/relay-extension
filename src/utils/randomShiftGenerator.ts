import type { Shift } from '../types';

export interface RandomShiftConfig {
    targetHours: number;
    minShiftHours: number;
    maxShiftHours: number;
    selectedDates: string[]; // ISO date strings
    jobTitle: string;
}

export const generateRandomShifts = (config: RandomShiftConfig): { success: boolean; shifts?: Shift[]; error?: string } => {
    const { targetHours, minShiftHours, maxShiftHours, selectedDates, jobTitle } = config;

    if (targetHours <= 0) {
        return { success: false, error: 'Target hours must be greater than 0' };
    }
    if (minShiftHours > maxShiftHours) {
        return { success: false, error: 'Min hours cannot be greater than Max hours' };
    }
    if (selectedDates.length === 0) {
        return { success: false, error: 'Please select at least one valid date.' };
    }

    const validDates = [...selectedDates];

    let currentTotal = 0;
    const generatedShifts: Shift[] = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 200; // Increased safety break

    // Helper to format float hour (9.5) to "9:30am"
    const formatTime = (floatHour: number): string => {
        const h = Math.floor(floatHour);
        const m = Math.round((floatHour - h) * 60);
        const period = h >= 12 ? 'pm' : 'am';
        const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const displayM = m.toString().padStart(2, '0');
        return `${displayH}:${displayM}${period}`;
    };

    // Shuffle dates to distribute shifts randomly
    // We might loop through dates multiple times if target is high
    while (currentTotal < targetHours && attempts < MAX_ATTEMPTS) {
        // Shuffle valid dates each pass to avoid order bias
        const shuffledDates = [...validDates].sort(() => Math.random() - 0.5);

        for (const dateStr of shuffledDates) {
            if (currentTotal >= targetHours) break;

            // Determine duration
            const remaining = targetHours - currentTotal;
            let duration = minShiftHours + Math.random() * (maxShiftHours - minShiftHours);

            // Round to nearest 0.25 (15 mins)
            duration = Math.round(duration * 4) / 4;

            // Cap at remaining
            if (duration > remaining) {
                if (remaining < 0.5 && generatedShifts.length > 0) {
                    // If remaining is tiny, just skip/stop or append? 
                    // Let's use it if valid, else break
                    duration = remaining;
                } else {
                    duration = remaining;
                }
            }

            // If duration < 0.25, stop (basically done)
            if (duration < 0.25) {
                currentTotal = targetHours;
                break;
            }

            // Random Start Time between 8am (8) and 6pm (18) - duration
            const earliestStart = 8;
            const latestStart = 18 - duration;
            const validLatestStart = Math.max(earliestStart, latestStart);

            let startHour = earliestStart + Math.random() * (validLatestStart - earliestStart);
            startHour = Math.round(startHour * 4) / 4; // Round start to 15m
            const endHour = startHour + duration;

            // Check collisions/stacking
            const existingOnDate = generatedShifts.find(s => s.date === dateStr);
            if (existingOnDate) {
                // Skip if we have plenty other dates, else allow with low probability
                if (validDates.length > 3 && Math.random() > 0.3) continue;
            }

            generatedShifts.push({
                date: dateStr,
                startTime: formatTime(startHour),
                endTime: formatTime(endHour),
                totalHours: parseFloat(duration.toFixed(2)),
                jobTitle: jobTitle,
                fillStatus: 'pending',
                isMigrated: false
            });

            currentTotal += duration;
        }
        attempts++;
    }

    // Final sort by date
    generatedShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { success: true, shifts: generatedShifts };
};
