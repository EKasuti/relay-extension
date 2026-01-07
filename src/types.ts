export interface Shift {
    date: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    jobTitle: string;
    description?: string;
    isMigrated: boolean;
    fillStatus?: 'pending' | 'success' | 'error';
    fillMessage?: string;
}

/**
 * Timesheet from JobX
 * startDate and endDate are ISO strings
 * elementIndex is used to find the row again
 */
export interface Timesheet {
    startDate: string;
    endDate: string;
    status: string;
    payPeriodString: string;
    elementIndex: number;
}
