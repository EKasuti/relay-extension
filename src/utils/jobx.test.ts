
import { describe, it, expect } from 'vitest';
import { parseTime } from './jobx';

describe('parseTime', () => {
    // Normal 12h
    it('parses normal 12h time: 8:00', () => {
        expect(parseTime('8:00')).toEqual({ hour: '8', minute: '00', period: 'AM' }); // Assumes AM for 8
    });

    // 12h with AM/PM
    it('parses 12h with AM: 8:03 am', () => {
        expect(parseTime('8:03 am')).toEqual({ hour: '8', minute: '03', period: 'AM' });
    });

    it('parses 12h with PM: 3:30 pm', () => {
        expect(parseTime('3:30 pm')).toEqual({ hour: '3', minute: '30', period: 'PM' });
    });

    it('parses compact PM: 12:30p', () => {
        expect(parseTime('12:30p')).toEqual({ hour: '12', minute: '30', period: 'PM' });
    });

    // 24h conversion
    it('converts 15:30 to 3:30 PM', () => {
        expect(parseTime('15:30')).toEqual({ hour: '3', minute: '30', period: 'PM' });
    });

    it('converts 14:00 to 2:00 PM', () => {
        expect(parseTime('14:00')).toEqual({ hour: '2', minute: '00', period: 'PM' });
    });

    it('converts 00:30 to 12:30 AM', () => {
        expect(parseTime('00:30')).toEqual({ hour: '12', minute: '30', period: 'AM' });
    });

    // Noon / Midnight
    it('handles Noon (12:00) as PM', () => {
        // "12:00" -> 12:00 PM
        expect(parseTime('12:00')).toEqual({ hour: '12', minute: '00', period: 'PM' });
    });

    it('handles 12:00 PM explicitly', () => {
        expect(parseTime('12:00 PM')).toEqual({ hour: '12', minute: '00', period: 'PM' });
    });

    it('handles 12:00 AM explicitly', () => {
        expect(parseTime('12:00 AM')).toEqual({ hour: '12', minute: '00', period: 'AM' });
    });

    // Edge / Error
    it('returns null for invalid minutes', () => {
        expect(parseTime('12:99')).toBeNull();
    });

    it('returns null for garbage', () => {
        expect(parseTime('not a time')).toBeNull();
    });
});
