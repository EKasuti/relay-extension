import type { Timesheet } from '../types';

/**
 * Scrapes job titles from the JobX Dashboard "Hires" table.
 */
export const scrapeJobTitles = (): { success: boolean; data?: string[]; message?: string } => {
    const table = document.getElementById('currHireTable');
    if (!table) return { success: false, message: 'Could not find "Hires" table.' };

    const jobTitles: string[] = [];
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const firstTh = row.querySelector('th');
        if (firstTh && firstTh.textContent) {
            jobTitles.push(firstTh.textContent.trim());
        }
    });

    return { success: true, data: jobTitles };
};

/**
 * Scrapes timesheets from the JobX Job Details page.
 */
export const scrapeTimesheets = (): { success: boolean; data?: Timesheet[]; message?: string } => {
    const table = document.getElementById('Skin_body_TimesheetList');
    if (!table) return { success: false, message: 'Timesheet table not found.' };

    const parseDateRange = (text: string) => {
        let startStr: string, endStr: string;

        // Try simple MM/DD/YYYY format first
        const simpleMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (simpleMatch) {
            startStr = simpleMatch[1];
            endStr = simpleMatch[2];
        } else {
            // Fallback to text parsing
            const cleanText = text.replace(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), /g, '');
            const parts = cleanText.split('-').map(s => s.trim());
            if (parts.length !== 2) return null;

            // Add current year if missing? The text usually has it.
            const currentYear = new Date().getFullYear();
            startStr = parts[0];
            endStr = parts[1];

            // If these are just "Dec 21", append year
            if (!startStr.match(/\d{4}/)) startStr += ` ${currentYear}`;
            if (!endStr.match(/\d{4}/)) endStr += ` ${currentYear}`;
        }

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);

        // Validation
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

        return { start: startDate.toISOString(), end: endDate.toISOString() };
    };

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const sheets: Timesheet[] = [];

    rows.forEach((row, idx) => {
        if (row.classList.contains('title') || row.classList.contains('colhead')) return;

        const statusCell = row.querySelector('.status');
        const ppCell = row.querySelector('.pp');

        if (statusCell && ppCell) {
            const status = statusCell.textContent?.trim() || 'Unknown';

            const dateDiv = ppCell.querySelector('div');
            const textToParse = dateDiv ? dateDiv.textContent?.trim() || '' : ppCell.textContent?.trim() || '';

            const dates = parseDateRange(textToParse);
            if (dates) {
                sheets.push({
                    startDate: dates.start,
                    endDate: dates.end,
                    status: status,
                    payPeriodString: textToParse,
                    elementIndex: idx
                });
            }
        }
    });

    return { success: true, data: sheets };
};

export const findLinkAndUrl = (title: string): { found: boolean; url?: string; message?: string } => {
    const links = Array.from(document.querySelectorAll('a'));
    const link = links.find(a => a.textContent?.trim() === title || a.innerText?.includes(title));
    if (link && link.href) {
        return { found: true, url: link.href };
    }
    return { found: false, message: `Could not find link for job "${title}" on dashboard.` };
};

export const startTimesheet = (rowIndex: number): { success: boolean; message: string } => {
    const table = document.getElementById('Skin_body_TimesheetList');
    if (!table) return { success: false, message: 'Timesheet table not found.' };

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const targetRow = rows[rowIndex];

    if (!targetRow) return { success: false, message: 'Timesheet row not found.' };

    const link = targetRow.querySelector('.tslink a') as HTMLElement;

    if (!link) {
        return { success: false, message: 'Link not found in row. Timesheet might be locked or unavailable.' };
    }

    const text = link.textContent?.trim();

    // Auto-accept confirmation dialogs
    const originalConfirm = window.confirm;
    window.confirm = () => true;

    try {
        link.click();
        return { success: true, message: `Clicked "${text}"` };
    } catch (e) {
        console.error('Error clicking timesheet link:', e);
        const errorMessage =
            e instanceof Error
                ? `Error clicking link: ${e.message}`
                : `Error clicking link: ${String(e)}`;
        return { success: false, message: errorMessage };
    } finally {
        window.confirm = originalConfirm;
    }
};

export const returnToTimesheetList = (): { success: boolean; message: string } => {
    // Specific selector from user request: #Skin_body_NavOptionsDiv a with "Return to Hire"
    const navDiv = document.getElementById('Skin_body_NavOptionsDiv');
    if (navDiv) {
        const links = Array.from(navDiv.querySelectorAll('a'));
        const returnLink = links.find(a => a.textContent?.trim() === 'Return to Hire');
        if (returnLink) {
            returnLink.click();
            return { success: true, message: 'Navigating back to Hire Details...' };
        }
    }

    // Fallback: Look for generic "Return" or "Back" links
    const links = Array.from(document.querySelectorAll('a'));
    const returnLink = links.find(a =>
        (a.textContent?.toLowerCase().includes('return') && a.textContent?.toLowerCase().includes('list')) ||
        (a.textContent?.toLowerCase().includes('back') && a.textContent?.toLowerCase().includes('list'))
    );

    if (returnLink) {
        returnLink.click();
        return { success: true, message: 'Navigating back to list...' };
    }

    // Fallback: If we can't find the link, we might need to rely on the sidepanel to just update the tab URL
    // specific to the expected list page: Tsx_StuTimesheetList.aspx
    if (window.location.href.includes('Tsx_StuCreateTimesheet.aspx') || window.location.href.includes('Tsx_StuTimesheet.aspx')) {
        // We are on a detail page.
        return { success: false, message: 'Could not find return link. Please navigate back manually.' };
    }

    return { success: false, message: 'Already on list or link not found.' };
};
