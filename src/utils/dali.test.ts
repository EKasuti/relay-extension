import { describe, it, expect } from 'vitest';
import { entriesToShifts, type DaliTimesheet } from './dali';

const sheet = (entries: DaliTimesheet['entries'], hireLabel = 'DALI — Reactor (P2)'): DaliTimesheet => ({
    hireKey: 'role1',
    hireLabel,
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-31T00:00:00.000Z',
    availableHires: [{ key: 'role1', label: hireLabel }],
    entries,
});

describe('entriesToShifts', () => {
    it('maps each entry to a shift with the hire label as job title', () => {
        const shifts = entriesToShifts(
            sheet([
                {
                    startAt: '2026-01-15T14:00:00.000Z',
                    endAt: '2026-01-15T16:30:00.000Z',
                    description: 'Design review',
                    projectLabel: 'ignored — hireLabel wins',
                },
            ]),
        );

        expect(shifts).toHaveLength(1);
        const s = shifts[0];
        expect(s.jobTitle).toBe('DALI — Reactor (P2)');
        expect(s.description).toBe('Design review');
        // 14:00 → 16:30 is 2.5h regardless of the machine timezone.
        expect(s.totalHours).toBe(2.5);
        expect(s.isMigrated).toBe(false);
        // Format is stable even if the wall-clock values are tz-dependent.
        expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(s.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(s.endTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('rounds fractional hours to 2 decimals and drops empty descriptions', () => {
        const shifts = entriesToShifts(
            sheet([
                {
                    startAt: '2026-02-02T13:00:00.000Z',
                    endAt: '2026-02-02T13:20:00.000Z', // 20 min → 0.33h
                    description: '',
                    projectLabel: '',
                },
            ]),
        );

        expect(shifts[0].totalHours).toBe(0.33);
        expect(shifts[0].description).toBeUndefined();
    });

    it('falls back to the entry projectLabel when hireLabel is empty', () => {
        const shifts = entriesToShifts(
            sheet(
                [
                    {
                        startAt: '2026-03-01T15:00:00.000Z',
                        endAt: '2026-03-01T16:00:00.000Z',
                        description: 'x',
                        projectLabel: 'Fallback Project',
                    },
                ],
                '',
            ),
        );

        expect(shifts[0].jobTitle).toBe('Fallback Project');
    });

    it('returns an empty array for no entries', () => {
        expect(entriesToShifts(sheet([]))).toEqual([]);
    });
});
