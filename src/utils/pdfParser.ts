import * as pdfjsLib from 'pdfjs-dist';
import type { Shift } from '../types';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ==========================================
// Constants & Configuration
// ==========================================

const CONFIG = {
    Y_TOLERANCE: 5,
    IDX_X: 4,
    IDX_Y: 5,
    WTW_SIGNATURE: 'WhenToWork.com',
};

const REGEX = {
    // ConnectTeam: "Fri 6/6" -> captures "6/6"
    DATE_ROW_CONNECT_TEAM: /[A-Z][a-z]{2}\s+(\d{1,2}\/\d{1,2})/,
    // WhenToWork: "Dec-14"
    DATE_HEADER_WTW: /^[A-Z][a-z]{2}-\d{1,2}$/,
    // WhenToWork: "Week Of Dec 14, 2025" -> captures "2025"
    WEEK_OF_WTW: /Week Of [A-Z][a-z]{2} \d{1,2}, (\d{4})/,
    // Time Components
    // Matches "10:00am", "10am", "10:30pm"
    TIME_PART: `\\d{1,2}(?::\\d{2})?(?:am|pm)`,
};

// Complex regexes
// Matches "10am - 12pm" (Group 1, Group 2) or "10am -" (Group 1, undefined)
const REGEX_TIME_RANGE_COMBINED = new RegExp(`(${REGEX.TIME_PART})(?:\\s*-\\s*)(${REGEX.TIME_PART})?`, 'i');
const REGEX_TIME_SINGLE = new RegExp(`(${REGEX.TIME_PART})`, 'i');

const MONTH_MAP: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

// ==========================================
// Types & Interfaces
// ==========================================

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

interface UnmatchedShift {
    startTime: string;
    endTime: string;
    totalHours: number;
    jobTitle: string;
    y: number; // Used for geometric matching
}

// ==========================================
// Core Parser
// ==========================================

/**
 * Parses shifts from a PDF file.
 * Automatically detects format (ConnectTeam or WhenToWork) and delegates to specific parsers.
 */
export async function parseShiftsFromPdf(file: File): Promise<Shift[]> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Detect Format from Page 1 signature
    const page1 = await pdf.getPage(1);
    const content1 = await page1.getTextContent();
    const allText = content1.items.map((item: any) => item.str).join(' ');

    if (allText.includes(CONFIG.WTW_SIGNATURE)) {
        return parseWhenToWorkPdf(pdf);
    } else {
        return parseConnectTeamPdf(pdf);
    }
}

// ==========================================
// WhenToWork Parser
// ==========================================

/**
 * Parses shifts from a WhenToWork PDF document.
 *
 * This function reads all pages of a WhenToWork-generated schedule PDF,
 * extracts date headers and shift data, and converts them into an array
 * of {@link Shift} objects.
 *
 * @param pdf - The PDF.js document instance representing the WhenToWork PDF.
 * @returns A promise that resolves to an array of parsed {@link Shift} objects.
 */
async function parseWhenToWorkPdf(pdf: any): Promise<Shift[]> {
    const shifts: Shift[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as unknown as TextItem[];

        // 1. Extract context (Year)
        const year = extractYearFromWTW(items);

        // 2. Identify Date Columns
        const dateHeaders = items.filter(i => REGEX.DATE_HEADER_WTW.test(i.str.trim()))
            .sort((a, b) => a.transform[CONFIG.IDX_X] - b.transform[CONFIG.IDX_X]);

        if (dateHeaders.length === 0) continue;

        // 3. Group items by column
        const columnItems = groupItemsByColumn(items, dateHeaders);

        // 4. Parse shifts per column
        for (const [dateStr, colItems] of Object.entries(columnItems)) {
            const parsedShifts = parseWTWColumnShifts(colItems, dateStr, year);
            shifts.push(...parsedShifts);
        }
    }

    if (shifts.length === 0) console.warn('No shifts parsed (WhenToWork).');
    return shifts;
}

function extractYearFromWTW(items: TextItem[]): number {
    const allStr = items.map(i => i.str).join(' ');
    const match = allStr.match(REGEX.WEEK_OF_WTW);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

/**
 * Groups non-header text items into columns based on their proximity to header items.
 *
 * Each non-header item is assigned to the closest header on the X-axis that is above it
 * on the page, producing a mapping from header text to the items in that column.
 *
 * @param items - All text items extracted from the page, including headers and non-headers.
 * @param headers - Text items that act as column headers (e.g., date labels).
 * @returns A mapping from each header's text to the list of text items belonging to that column.
 */
function groupItemsByColumn(items: TextItem[], headers: TextItem[]): Record<string, TextItem[]> {
    const groups: Record<string, TextItem[]> = {};
    headers.forEach(h => groups[h.str] = []);

    const nonHeaderItems = items.filter(i => !REGEX.DATE_HEADER_WTW.test(i.str.trim()));

    // Optimization: Calculate column X-midpoints for O(1) assignment
    const boundaries: { header: TextItem, maxX: number }[] = [];
    for (let i = 0; i < headers.length; i++) {
        const current = headers[i];
        const next = headers[i + 1];

        let maxX = Infinity;
        if (next) {
            // Midpoint between this header and next
            maxX = (current.transform[CONFIG.IDX_X] + next.transform[CONFIG.IDX_X]) / 2;
        }
        boundaries.push({ header: current, maxX });
    }

    // Single pass through items (O(N))
    for (const item of nonHeaderItems) {
        const itemX = item.transform[CONFIG.IDX_X];
        const itemY = item.transform[CONFIG.IDX_Y];

        // Find which column it falls into
        const match = boundaries.find(b => itemX < b.maxX);
        if (match) {
            // Only add if visually below the header line
            if (itemY < match.header.transform[CONFIG.IDX_Y]) {
                groups[match.header.str].push(item);
            }
        }
    }

    return groups;
}

/**
 * Parses shift data from a single WhenToWork column into structured Shift objects.
 *
 * @param items - The text items that belong to a single WhenToWork date column.
 * @param dateHeader - The column's date header string (e.g., "Dec-14") used to determine the shift date.
 * @param year - The year extracted from the "Week Of" header, combined with the date header to form a full date.
 * @returns An array of Shift objects parsed from the specified WhenToWork column.
 */
function parseWTWColumnShifts(items: TextItem[], dateHeader: string, year: number): Shift[] {
    const shifts: Shift[] = [];

    // Sort top-to-bottom
    const sortedItems = items
        .filter(i => i.str.trim().length > 0)
        .sort((a, b) => b.transform[CONFIG.IDX_Y] - a.transform[CONFIG.IDX_Y]);

    let currentJobTitle = "Unknown";
    const fullDate = FormatUtils.parseDateWTW(dateHeader, year);

    if (!fullDate) return [];

    let i = 0;
    while (i < sortedItems.length) {
        const item = sortedItems[i];
        const text = item.str;

        // Try to match time patterns
        const combinedMatch = text.match(REGEX_TIME_RANGE_COMBINED);
        const singleStartMatch = text.match(REGEX_TIME_SINGLE);

        if (combinedMatch && combinedMatch[2]) {
            // Case A: "10am - 12pm" (Combined)
            const startTime = combinedMatch[1];
            const endTime = combinedMatch[2];
            shifts.push({
                date: fullDate,
                startTime,
                endTime,
                totalHours: TimeUtils.calculateDuration(startTime, endTime),
                jobTitle: currentJobTitle.trim(),
                isMigrated: false
            });
            i++; // Move to next item
        }
        else if (singleStartMatch) {
            // Case B: "10am -" (Split Line)
            const startTime = singleStartMatch[1];

            // Look ahead for End Time (next item)
            if (i + 1 < sortedItems.length) {
                const nextItem = sortedItems[i + 1];
                const endMatch = nextItem.str.match(REGEX_TIME_SINGLE);

                if (endMatch) {
                    const endTime = endMatch[1];
                    shifts.push({
                        date: fullDate,
                        startTime,
                        endTime,
                        totalHours: TimeUtils.calculateDuration(startTime, endTime),
                        jobTitle: currentJobTitle.trim(),
                        isMigrated: false
                    });
                    i += 2; // Consume both items
                    continue; // Skip the increment at end of loop since we handled it
                }
            }
            i++;
        }
        else {
            // Not a time -> assume it's a Job Title
            if (text.trim().length > 1 && !text.includes(CONFIG.WTW_SIGNATURE)) {
                currentJobTitle = text;
            }
            i++;
        }
    }

    return shifts;
}


// ==========================================
// ConnectTeam Parser
// ==========================================

async function parseConnectTeamPdf(pdf: any): Promise<Shift[]> {
    const shifts: Shift[] = [];
    let year = new Date().getFullYear();
    let yearFound = false;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as unknown as TextItem[];

        // Group text items by physical line (Y-coordinate)
        const lines = HelperUtils.groupItemsByLine(items);

        const dateAnchors: DateAnchor[] = [];
        const shiftLines: UnmatchedShift[] = [];

        for (const line of lines) {
            const fullLine = line.items.map(i => i.str).join(' ');

            // 1. Try to find year
            if (!yearFound) {
                const foundYear = HelperUtils.findYearInText(fullLine);
                if (foundYear) {
                    year = foundYear;
                    yearFound = true;
                }
            }

            // 2. Identify Date Anchors (e.g. "Sat 6/7")
            const dateMatch = fullLine.match(REGEX.DATE_ROW_CONNECT_TEAM);
            if (dateMatch) {
                dateAnchors.push({ date: dateMatch[1], y: line.y });
            }

            // 3. Identify Shift Rows
            const shiftLine = HelperUtils.parseConnectTeamShiftLine(fullLine, line.y);
            if (shiftLine) {
                shiftLines.push(shiftLine);
            }
        }

        // Match shifts to closest date anchor
        if (dateAnchors.length > 0) {
            shiftLines.forEach(shift => {
                const bestAnchor = HelperUtils.findClosestY(shift.y, dateAnchors);
                if (bestAnchor) {
                    const [m, d] = bestAnchor.date.split('/');
                    const fullDate = FormatUtils.formatIsoDate(year, m, d);

                    shifts.push({
                        date: fullDate,
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        totalHours: shift.totalHours,
                        jobTitle: shift.jobTitle,
                        isMigrated: false
                    });
                }
            });
        }
    }

    if (shifts.length === 0) console.warn('No shifts parsed (ConnectTeam).');
    return shifts;
}


// ==========================================
// Utilities
// ==========================================

const TimeUtils = {
    /**
     * Calculates duration between two time strings. 
     * Handles "10am" (no minutes) and overnight shifts.
     */
    calculateDuration(start: string, end: string): number {
        const parse = (t: string) => {
            const normalized = t.trim().replace(/\s+/g, '');
            const [time, period] = normalized.split(/(?=[ap]m)/i);

            // Validate that both time and period exist
            if (!time || !period) {
                console.warn(`Invalid time string "${t}" (expected format like "10am" or "10:30pm")`);
                return NaN;
            }

            let [h, m] = time.split(':').map(Number);
            if (Number.isNaN(h)) {
                console.warn(`Invalid hour component in time string "${t}"`);
                return NaN;
            }
            if (Number.isNaN(m)) m = 0; // Handle "10am" -> 10:00

            const periodLower = period.toLowerCase();
            if (periodLower === 'pm' && h < 12) h += 12;
            if (periodLower === 'am' && h === 12) h = 0;
            return h + m / 60;
        };

        const s = parse(start);
        const e = parse(end);
        if (Number.isNaN(s) || Number.isNaN(e)) {
            // Propagate invalid input as NaN duration instead of throwing
            return NaN;
        }
        let diff = e - s;
        if (diff < 0) diff += 24; // Overnight shift
        return parseFloat(diff.toFixed(2));
    }
};

const FormatUtils = {
    /** format: YYYY-MM-DD */
    formatIsoDate(year: number, monthVal: string, dayVal: string): string {
        const m = monthVal.padStart(2, '0');
        const d = dayVal.padStart(2, '0');
        return `${year}-${m}-${d}`;
    },

    /** Parses "Jan-04" with a year into "2025-01-04" */
    parseDateWTW(dateHeader: string, year: number): string | null {
        const [mon, day] = dateHeader.split('-');
        const monNum = MONTH_MAP[mon];
        if (!monNum) {
            console.warn(`Unrecognized month "${mon}"`);
            return null;
        }
        return this.formatIsoDate(year, monNum, day);
    }
};

const HelperUtils = {
    groupItemsByLine(items: TextItem[]): { y: number; items: TextItem[] }[] {
        const lines: { y: number; items: TextItem[] }[] = [];
        items.forEach(item => {
            const y = item.transform[CONFIG.IDX_Y];
            const line = lines.find(l => Math.abs(l.y - y) < CONFIG.Y_TOLERANCE);
            if (line) {
                line.items.push(item);
            } else {
                lines.push({ y, items: [item] });
            }
        });

        // Sort Top -> Bottom, Left -> Right
        return lines
            .sort((a, b) => b.y - a.y)
            .map(line => ({
                y: line.y,
                items: line.items.sort((a, b) => a.transform[CONFIG.IDX_X] - b.transform[CONFIG.IDX_X])
            }));
    },

    findYearInText(text: string): number | null {
        const match = text.match(/\d{4}/);
        if (match) {
            const y = parseInt(match[0], 10);
            if (y > 2020 && y < 2030) return y;
        }
        return null;
    },

    parseConnectTeamShiftLine(fullLine: string, y: number): UnmatchedShift | null {
        // Look for two times
        const timeMatches = [...fullLine.matchAll(/(\d{1,2}:\d{2}\s?(?:am|pm))/gi)];
        if (timeMatches.length < 2) return null;

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
            if (decimalMatch) totalHours = parseFloat(decimalMatch[1]);
        }

        if (totalHours <= 0) return null;

        // Clean up Job Title
        const timeIndex = fullLine.indexOf(startTime);
        let typeRaw = fullLine.substring(0, timeIndex).trim();
        typeRaw = typeRaw.replace(REGEX.DATE_ROW_CONNECT_TEAM, '').trim();
        typeRaw = typeRaw.replace(/No sub jobs/g, '').trim();
        typeRaw = typeRaw.replace(/\s{2,}/g, ' ');
        const jobTitle = typeRaw || "Unknown";

        return { startTime, endTime, totalHours, jobTitle, y };
    },

    findClosestY<T extends { y: number }>(targetY: number, candidates: T[]): T | null {
        let best: T | null = null;
        let minDist = Infinity;
        for (const c of candidates) {
            const dist = Math.abs(targetY - c.y);
            if (dist < minDist) {
                minDist = dist;
                best = c;
            }
        }
        return best;
    }
};
