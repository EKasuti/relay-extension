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
const TRANSFORM_X_INDEX = 4;

/**
 * Parses shifts from a PDF file.
 * Automatically detects format (ConnectTeam or WhenToWork).
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

    // Detect Format from Page 1
    const page1 = await pdf.getPage(1);
    const content1 = await page1.getTextContent();
    const allText = content1.items.map((item: any) => item.str).join(' ');

    if (allText.includes('WhenToWork.com')) {
        return parseWhenToWorkPdf(pdf);
    } else {
        return parseConnectTeamPdf(pdf);
    }
}

async function parseConnectTeamPdf(pdf: any): Promise<Shift[]> {
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
            line.items.sort((a, b) => a.transform[TRANSFORM_X_INDEX] - b.transform[TRANSFORM_X_INDEX]);
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

                // Extract total hours
                const afterEndTime = fullLine.substring(fullLine.indexOf(endTime) + endTime.length);
                const durationMatch = afterEndTime.match(/\b(\d{1,2}:\d{2})\b/);

                let totalHours = 0;
                if (durationMatch) {
                    const [h, m] = durationMatch[1].split(':').map(Number);
                    totalHours = h + (m / 60);
                } else {
                    const decimalMatch = afterEndTime.match(/(\d+\.\d{2})/);
                    if (decimalMatch) {
                        totalHours = parseFloat(decimalMatch[1]);
                    }
                }

                // Extract Job Title
                const timeIndex = fullLine.indexOf(startTime);
                let typeRaw = fullLine.substring(0, timeIndex).trim();
                typeRaw = typeRaw.replace(dateRowRegex, '').trim();
                typeRaw = typeRaw.replace(/No sub jobs/g, '').trim();
                typeRaw = typeRaw.replace(/\s{2,}/g, ' ');
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
        console.warn('No shifts parsed (ConnectTeam).');
    }
    return shifts;
}

async function parseWhenToWorkPdf(pdf: any): Promise<Shift[]> {
    const shifts: Shift[] = [];

    // We expect "Week Of [Month] [Day], [Year]" on the page
    // And columns for days.

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as unknown as TextItem[];

        // Extract Year from "Week Of" header if possible
        // Pattern: "Week Of Dec 14, 2025"
        const allStr = items.map(i => i.str).join(' ');
        const weekOfMatch = allStr.match(/Week Of [A-Z][a-z]{2} \d{1,2}, (\d{4})/);
        const year = weekOfMatch ? parseInt(weekOfMatch[1], 10) : new Date().getFullYear();

        // Identify Date Header Row
        // Items looking like "Dec-14", "Jan-02"
        const dateRegex = /^[A-Z][a-z]{2}-\d{1,2}$/;
        const dateHeaders = items.filter(i => dateRegex.test(i.str.trim()));

        // Sort headers by X coordinate
        dateHeaders.sort((a, b) => a.transform[TRANSFORM_X_INDEX] - b.transform[TRANSFORM_X_INDEX]);

        if (dateHeaders.length === 0) continue;

        // Determine column boundaries
        // We will define a column by a range [start, end]
        // Simple approach: Use midpoints
        const secondaryItems = items.filter(i => !dateRegex.test(i.str.trim()));

        // Group items by Date Column
        // Find closest date header X
        const columnItems: { [dateStr: string]: TextItem[] } = {};

        dateHeaders.forEach(h => {
            columnItems[h.str] = [];
        });

        secondaryItems.forEach(item => {
            const x = item.transform[TRANSFORM_X_INDEX];
            // Find closest header
            let closestHeader: TextItem | null = null;
            let minDiff = Infinity;

            for (const header of dateHeaders) {
                const diff = Math.abs(header.transform[TRANSFORM_X_INDEX] - x);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestHeader = header;
                }
            }

            // Heuristic: Must be reasonably close (e.g. within 50-60px? Columns are wide)
            // But relying on "closest" is usually safe in a grid unless it's strictly outside
            if (closestHeader && minDiff < 100) {
                // Ensure item is BELOW the header y-wise
                if (item.transform[TRANSFORM_Y_INDEX] < closestHeader.transform[TRANSFORM_Y_INDEX]) {
                    columnItems[closestHeader.str].push(item);
                }
            }
        });

        // Parse shifts for each column
        for (const [dateStr, rawItems] of Object.entries(columnItems)) {
            // Sort items top-to-bottom and filter out empty strings
            const sortedItems = rawItems
                .filter(i => i.str.trim().length > 0)
                .sort((a, b) => b.transform[TRANSFORM_Y_INDEX] - a.transform[TRANSFORM_Y_INDEX]);

            // Construct Shift Blocks
            // Pattern per shift: 
            // 1. Job Title (Optional/Sometimes separate line) - e.g. "Ramekin"
            // 2. Start Time line - e.g. "7:30am -"
            // 3. End Time line - e.g. "9:30am"

            // We can iterate and consume
            let i = 0;
            while (i < sortedItems.length) {
                const text = sortedItems[i].str;

                // Identify Start Time
                const startMatch = text.match(/(\d{1,2}:\d{2}(?:am|pm))\s?-/i);
                if (startMatch) {
                    const startTime = startMatch[1];
                    let endTime: string | null = null;
                    let jobTitle = "Unknown";

                    // Look ahead for End Time
                    if (i + 1 < sortedItems.length) {
                        const nextText = sortedItems[i + 1].str;
                        const endMatch = nextText.match(/(\d{1,2}:\d{2}(?:am|pm))/i);
                        if (endMatch) {
                            endTime = endMatch[1];
                        }
                    }

                    // Look behind for Job Title (if it exists)
                    if (i > 0) {
                        const prevText = sortedItems[i - 1].str;
                        // Avoid noise or other shifts
                        // Check if previous looks like a time
                        if (!prevText.match(/\d{1,2}:\d{2}/) && !prevText.includes('-')) {
                            jobTitle = prevText;
                        }
                    }

                    if (endTime) {
                        // Parse Date
                        // dateStr is like "Dec-14"
                        const [mon, day] = dateStr.split('-');
                        // Need to convert Month str to number
                        const months: { [k: string]: string } = {
                            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                        };
                        const monNum = months[mon];
                        const dayNum = day.padStart(2, '0');
                        const fullDate = `${year}-${monNum}-${dayNum}`;

                        // Calculate Hours
                        // Simple diff
                        // Helper needed
                        const duration = calculateHours(startTime, endTime);

                        shifts.push({
                            date: fullDate,
                            startTime,
                            endTime,
                            totalHours: duration,
                            jobTitle: jobTitle.trim(),
                            isMigrated: false
                        });

                        // Advance index past end time
                        i += 2;
                        continue;
                    }
                }
                i++;
            }
        }
    }

    if (shifts.length === 0) {
        console.warn('No shifts parsed (WhenToWork).');
    }

    return shifts;
}

function calculateHours(start: string, end: string): number {
    const parse = (t: string) => {
        const [time, period] = t.split(/(?=[ap]m)/i);
        let [h, m] = time.split(':').map(Number);
        if (period.toLowerCase() === 'pm' && h < 12) h += 12;
        if (period.toLowerCase() === 'am' && h === 12) h = 0;
        return h + m / 60;
    };
    const s = parse(start);
    const e = parse(end);
    let diff = e - s;
    if (diff < 0) diff += 24; // overnight
    return parseFloat(diff.toFixed(2));
}
