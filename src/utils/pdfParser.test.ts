
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseShiftsFromPdf } from './pdfParser';
import * as pdfjsLib from 'pdfjs-dist';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
    getDocument: vi.fn(),
    GlobalWorkerOptions: { workerSrc: '' }
}));

// Mock the worker URL import
vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({
    default: 'mock-worker-url'
}));

// Mock File and Blob (if not in environment)
class MockFile {
    name: string;
    type: string;
    buffer: ArrayBuffer;

    constructor(content: string[], name: string, options?: any) {
        this.name = name;
        this.type = options?.type || '';
        this.buffer = new TextEncoder().encode(content.join('')).buffer;
    }

    async arrayBuffer() {
        return this.buffer;
    }
}

// Make sure global File is available if not already
if (typeof File === 'undefined') {
    (globalThis as any).File = MockFile;
}

describe('pdfParser', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockPdf = (pages: any[]) => {
        return {
            promise: Promise.resolve({
                numPages: pages.length,
                getPage: (pageNum: number) => Promise.resolve({
                    getTextContent: () => Promise.resolve({
                        items: pages[pageNum - 1]
                    })
                })
            })
        };
    };

    /**
     * Helper to create a mock text item
     */
    const item = (str: string, x: number, y: number, w: number = 10, h: number = 10) => ({
        str,
        dir: 'ltr',
        width: w,
        height: h,
        transform: [1, 0, 0, 1, x, y], // [sx, sy, skx, sky, x, y]
        hasEOL: false
    });

    it('detects WhenToWork format and parses shifts correctly', async () => {
        // Setup mock data for WhenToWork
        // Page 1 with "WhenToWork.com" and a schedule grid
        const page1Items = [
            item('WhenToWork.com - Schedule', 200, 700),
            item('Week Of Dec 14, 2025', 50, 650),

            // Header Row (Dates)
            item('Dec-14', 100, 600), // Sunday
            item('Dec-15', 200, 600), // Monday

            // Content for Dec-15 (Monday)
            // Note: Parser sorts by Y desc.
            // Items filtered by column X first.

            // Job Title
            item('Ramekin', 200, 500),
            // Empty noise (should be filtered out by recent fix)
            item('   ', 200, 498),
            // Start Time
            item('7:30am -', 200, 490),
            // End Time
            item('9:30am', 200, 480),
        ];

        (pdfjsLib.getDocument as any).mockReturnValue(createMockPdf([page1Items]));

        const file = new File(['fake-pdf-content'], 'schedule.pdf');
        const shifts = await parseShiftsFromPdf(file as any);

        expect(shifts).toHaveLength(1);
        expect(shifts[0]).toEqual({
            date: '2025-12-15', // Year 2025, Dec 15
            startTime: '7:30am',
            endTime: '9:30am',
            totalHours: 2.0,
            jobTitle: 'Ramekin',
            isMigrated: false
        });
    });

    it('filters out empty strings when parsing WhenToWork to correct job title', async () => {
        // Specifically testing the fix where invisible text caused job title to be missed/replaced
        const page1Items = [
            item('WhenToWork.com', 10, 700),
            item('Week Of Jan 02, 2026', 10, 650),
            item('Jan-02', 100, 600), // Friday column

            // Layout with invisible item between job and time
            item('Baker Desk', 100, 500),
            item('', 100, 500), // Invisible item at same/similar location
            item(' ', 100, 495), // Whitespace item
            item('12:00pm -', 100, 490),
            item('4:00pm', 100, 480)
        ];

        (pdfjsLib.getDocument as any).mockReturnValue(createMockPdf([page1Items]));

        const file = new File([''], 'test.pdf');
        const shifts = await parseShiftsFromPdf(file as any);

        expect(shifts).toHaveLength(1);
        expect(shifts[0].jobTitle).toBe('Baker Desk'); // Should NOT be "" or " "
        expect(shifts[0].totalHours).toBe(4.0);
    });

    it('falls back to ConnectTeam parser if WhenToWork signature is missing', async () => {
        // ConnectTeam mock data
        // It relies on grouped lines by Y
        const page1Items = [
            // No "WhenToWork.com" text
            item('Schedule Export', 200, 700),
            item('Sat 6/7', 50, 500), // Date anchor

            // Shift Line 1 roughly same Y
            // "Baker Desk 09:00 am 05:00 pm"
            item('Baker Desk', 100, 500),
            item('09:00 am', 200, 500),
            item('05:00 pm', 300, 500),
            item('8.00', 400, 500) // Duration is required by parser logic
        ];

        (pdfjsLib.getDocument as any).mockReturnValue(createMockPdf([page1Items]));

        const file = new File([''], 'connectteam.pdf');
        const shifts = await parseShiftsFromPdf(file as any);

        // Note: The ConnectTeam parser tries to find a Year from context or defaults to current year.
        // It also parses dates like "6/7".

        const currentYear = new Date().getFullYear();

        expect(shifts).toHaveLength(1);
        expect(shifts[0]).toMatchObject({
            date: `${currentYear}-06-07`,
            startTime: '09:00 am',
            endTime: '05:00 pm',
            jobTitle: 'Baker Desk',
            totalHours: 8.0
        });
    });

    it('handles WhenToWork column matching correctly', async () => {
        // Test multiple columns
        const page1Items = [
            item('WhenToWork.com', 10, 800),
            item('Week Of Dec 14, 2025', 10, 750),

            // Col 1: Dec-15 (x=100)
            item('Dec-15', 100, 700),
            // Col 2: Dec-16 (x=200)
            item('Dec-16', 200, 700),

            // Shift in Col 1
            item('Job A', 100, 600),
            item('8:00am -', 100, 590),
            item('10:00am', 100, 580),

            // Shift in Col 2 (slightly offset x but matches closest header)
            item('Job B', 205, 600), // x=205 matches 200 closer than 100
            item('11:00am -', 205, 590),
            item('12:00pm', 205, 580)
        ];

        (pdfjsLib.getDocument as any).mockReturnValue(createMockPdf([page1Items]));

        const file = new File([''], 'multi-col.pdf');
        const shifts = await parseShiftsFromPdf(file as any);

        expect(shifts).toHaveLength(2);

        const shiftA = shifts.find(s => s.jobTitle === 'Job A');
        expect(shiftA).toBeDefined();
        expect(shiftA?.date).toBe('2025-12-15');

        const shiftB = shifts.find(s => s.jobTitle === 'Job B');
        expect(shiftB).toBeDefined();
        expect(shiftB?.date).toBe('2025-12-16');
    });

    it('handles overnight shifts calculation for WhenToWork', async () => {
        const page1Items = [
            item('WhenToWork.com', 10, 800),
            item('Week Of Dec 14, 2025', 10, 750),
            item('Dec-15', 100, 700),

            item('Night Shift', 100, 600),
            item('10:00pm -', 100, 590),
            item('2:00am', 100, 580)
        ];

        (pdfjsLib.getDocument as any).mockReturnValue(createMockPdf([page1Items]));
        const file = new File([''], 'overnight.pdf');
        const shifts = await parseShiftsFromPdf(file as any);

        expect(shifts).toHaveLength(1);
        expect(shifts[0].startTime).toBe('10:00pm');
        expect(shifts[0].endTime).toBe('2:00am');
        // 10pm to 2am is 4 hours
        expect(shifts[0].totalHours).toBe(4.0);
    });
});
