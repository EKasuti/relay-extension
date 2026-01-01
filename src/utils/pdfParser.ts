import * as pdfjsLib from 'pdfjs-dist';
import type { Shift } from '../types';

// Best practice with Vite is often:
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Interface expected from pdfjs-dist TextItem
interface TextItem {
    str: string;
    dir: string;
    transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
    width: number;
    height: number;
    hasEOL: boolean;
}

interface DateAnchor {
    date: string;
    y: number;
}

interface ParsedShiftLine {
    startTime: string;
    endTime: string;
    totalHours: number;
    type: string;
    y: number;
}

const Y_COORDINATE_TOLERANCE = 5;
const TRANSFORM_Y_INDEX = 5;

/**
 * Parses shifts from a PDF file.
 * @param file The PDF file to parse.
 * @returns A promise that resolves to an array of Shift objects.
 */
export async function parseShiftsFromPdf(file: File): Promise<Shift[]> {
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
    });

    const pdf = await loadingTask.promise;
    const shifts: Shift[] = [];

    // Attempt to find year from document content, default to current year
    let year = new Date().getFullYear();
    let yearFound = false;

    // Pattern for Date row: "Sat 6/7", "Fri 6/6"
    // Regex: Day of week (3 letters) space Month/Day
    // Match strict pattern to avoid false positives
    // "Fri 6/6"
    // We capture "6/7"
    const dateRowRegex = /[A-Z][a-z]{2}\s+(\d{1,2}\/\d{1,2})/;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const items = textContent.items as unknown as TextItem[];

        // Group items by Y coordinate (lines)
        const lines: { y: number; items: TextItem[] }[] = [];

        items.forEach(item => {
            const y = item.transform[TRANSFORM_Y_INDEX];
            const line = lines.find(l => Math.abs(l.y - y) < Y_COORDINATE_TOLERANCE);
            if (line) {
                line.items.push(item);
            } else {
                lines.push({ y, items: [item] });
            }
        });

        // Sort lines by Y descending (Top to Bottom)
        lines.sort((a, b) => b.y - a.y);

        // Sort items within each line by X ascending
        lines.forEach(line => {
            line.items.sort((a, b) => a.transform[4] - b.transform[4]);
        });

        const dateAnchors: DateAnchor[] = [];
        const shiftLines: ParsedShiftLine[] = [];

        // Scan lines
        for (const line of lines) {
            const fullLine = line.items.map(i => i.str).join(' ');

            // 1. Try to extract Year
            if (!yearFound) {
                const yearMatch = fullLine.match(/\d{4}/);
                if (yearMatch) {
                    const foundYear = parseInt(yearMatch[0], 10);
                    if (foundYear > 2020 && foundYear < 2030) {
                        year = foundYear;
                        yearFound = true;
                    }
                }
            }

            // 2. Identify Date Anchors
            const dateMatch = fullLine.match(dateRowRegex);
            if (dateMatch) {
                dateAnchors.push({
                    date: dateMatch[1],
                    y: line.y
                });
            }

            // 3. Identify Shift Lines
            // Look for two times
            const timeMatches = [...fullLine.matchAll(/(\d{1,2}:\d{2}\s?(?:am|pm))/gi)];

            if (timeMatches.length >= 2) {
                const startTime = timeMatches[0][1];
                const endTime = timeMatches[1][1];

                // Extract total hours, looking for duration after end time
                const afterEndTime = fullLine.substring(fullLine.indexOf(endTime) + endTime.length);

                // Try HH:MM format first (e.g. 05:00)
                // regex for HH:MM that isn't am/pm
                const durationMatch = afterEndTime.match(/\b(\d{1,2}:\d{2})\b/);

                let totalHours = 0;
                if (durationMatch) {
                    // Check if it's followed by am/pm (false positive)
                    // But we used \b and simple : check.
                    const [h, m] = durationMatch[1].split(':').map(Number);
                    totalHours = h + (m / 60);
                } else {
                    // Try decimal match
                    const decimalMatch = afterEndTime.match(/(\d+\.\d{2})/);
                    if (decimalMatch) {
                        totalHours = parseFloat(decimalMatch[1]);
                    }
                }

                // Extract Job Title (Type for connectteam export)
                // The type appears before the times.
                // e.g. "Sat 6/7   Baker Desk  No sub jobs  09:03 am ..."
                // or "Fri 6/6   JMC Circulation Desk   No sub jobs ..."
                // or just "JMC Circulation Desk  No sub jobs ..." on shift lines without date.

                // Strategy: Get everything before the first specific time match.
                // Then clean up known noise.

                const timeIndex = fullLine.indexOf(startTime);
                let typeRaw = fullLine.substring(0, timeIndex).trim();

                // Remove Date if present (e.g. "Sat 6/7")
                typeRaw = typeRaw.replace(dateRowRegex, '').trim();

                // Remove "No sub jobs" noise
                typeRaw = typeRaw.replace(/No sub jobs/g, '').trim();

                // Remove multiple spaces
                typeRaw = typeRaw.replace(/\s{2,}/g, ' ');

                // If empty or just noise, default to "Unknown" or similar? 
                // However, lines sometimes contain multiple columns like "Type", "Sub job".
                // Log: "Baker Desk  No sub jobs" -> Type is Baker Desk.

                // We then use the cleaned string.
                const type = typeRaw || "Unknown";

                if (totalHours > 0) {
                    shiftLines.push({
                        startTime,
                        endTime,
                        totalHours,
                        type,
                        y: line.y
                    });
                }
            }
        }

        // 4. Match Shifts to closest Date Anchor
        if (dateAnchors.length > 0) {
            for (const shift of shiftLines) {
                let bestAnchor: DateAnchor | null = null;
                let minDist = Infinity;

                for (const anchor of dateAnchors) {
                    const dist = Math.abs(shift.y - anchor.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestAnchor = anchor;
                    }
                }

                if (bestAnchor) {
                    const [monthStr, dayStr] = bestAnchor.date.split('/');
                    const month = monthStr.padStart(2, '0');
                    const day = dayStr.padStart(2, '0');
                    const fullDate = `${year}-${month}-${day}`;
                    shifts.push({
                        date: fullDate,
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        totalHours: parseFloat(shift.totalHours.toFixed(2)),
                        jobTitle: shift.type,
                        isMigrated: false
                    });
                }
            }
        }
    }

    if (shifts.length === 0) {
        console.warn(
            'parseShiftsFromPdf: No shifts were parsed from the provided PDF. ' +
            'Ensure the file is a valid ConnectTeam export in the expected format.'
        );
    }
    return shifts;
}
