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

/**
 * Parses a time string into Hour, Minute, and Period (AM/PM).
 * Handles formats: "15:29", "12:30p", "8:03 am", "08:00"
 */
export const parseTime = (timeStr: string) => {
    // Robust parser for: "15:29", "12:30p", "8:03 am", "08:00"
    let clean = timeStr.toLowerCase().trim();
    // Keep digits, : and letters a, p, m
    clean = clean.replace(/[^a-z0-9:]/g, '');

    // Extract H:M
    const match = clean.match(/(\d{1,2}):(\d{1,2})/);
    if (!match) return null;

    let h = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);

    if (m < 0 || m > 59) return null;

    let period = 'AM'; // Default

    // Edge case: Check for PM indicators: 'p' or 'pm'
    if (clean.includes('p')) {
        period = 'PM';
    } else if (clean.includes('a')) {
        period = 'AM';
    } else {
        // No indicator implies 24h OR ambiguous 12h.
        // Map 24h to 12h
        if (h === 0) {
            h = 12;
            period = 'AM';
        } else if (h === 12) {
            period = 'PM';
        } else if (h > 12) {
            h -= 12;
            period = 'PM';
        } else {
            period = 'AM';
        }
    }

    return {
        hour: h.toString(), // "8", "12", "1" (no padding)
        minute: m.toString().padStart(2, '0'), // "03", "30" (padded)
        period: period
    };
};

/**
 * Fills the timesheet row for a given shift.
 */
export const fillShiftRow = (shiftDate: string, startTime: string, endTime: string): { success: boolean; message: string; debug?: string } => {
    const shiftD = new Date(shiftDate);
    // Format: MM/DD/YYYY
    const targetDateStr = `${shiftD.getMonth() + 1}/${shiftD.getDate()}/${shiftD.getFullYear()}`;

    // Find hidden input closest to this date
    const inputs = Array.from(document.querySelectorAll('input[type="hidden"]'));
    const targetInput = inputs.find(input =>
        (input as HTMLInputElement).value &&
        (input as HTMLInputElement).value.startsWith(targetDateStr) &&
        (input as HTMLInputElement).id.includes('QuickDate')
    );

    if (!targetInput) {
        return { success: false, message: `Could not find row for date ${targetDateStr}` };
    }

    const idParts = targetInput.id.split('_QuickDate_');
    if (idParts.length < 2) return { success: false, message: 'Could not parse row ID suffix' };
    const suffix = idParts[1];

    // Helper to select option
    const selectOption = (selectId: string, value: string) => {
        const select = document.getElementById(selectId) as HTMLSelectElement;
        if (!select) return `Missing ${selectId}`;

        select.value = value;
        if (select.value !== value) {
            let found = false;
            for (let i = 0; i < select.options.length; i++) {
                // Case insensitive check for value or text
                if (select.options[i].text.toLowerCase() === value.toLowerCase() ||
                    select.options[i].value.toLowerCase() === value.toLowerCase()) {
                    select.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) return `Failed to set ${selectId} to ${value}`;
        }
        return 'OK';
    };


    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (!start || !end) {
        return { success: false, message: `Failed to parse time. Start: ${startTime}, End: ${endTime}` };
    }

    const debugLog: string[] = [];

    // Set Start Time
    debugLog.push(`Start Input: ${startTime} -> ${start.hour}:${start.minute} ${start.period}`);
    debugLog.push(selectOption(`Skin_body_ctl01_StartHour1_${suffix}`, start.hour));
    debugLog.push(selectOption(`Skin_body_ctl01_StartMinute1_${suffix}`, start.minute));
    debugLog.push(selectOption(`Skin_body_ctl01_StartAmPm1_${suffix}`, start.period));

    // Set End Time
    debugLog.push(`End Input: ${endTime} -> ${end.hour}:${end.minute} ${end.period}`);
    debugLog.push(selectOption(`Skin_body_ctl01_EndHour1_${suffix}`, end.hour));
    debugLog.push(selectOption(`Skin_body_ctl01_EndMinute1_${suffix}`, end.minute));
    debugLog.push(selectOption(`Skin_body_ctl01_EndAmPm1_${suffix}`, end.period));

    // Set Pay Code
    selectOption(`Skin_body_ctl01_PayCodes1_${suffix}`, '1');

    // Click Save
    const saveBtn = document.getElementById(`Skin_body_ctl01_AddButton_${suffix}`);
    if (saveBtn) {
        saveBtn.click();
        return { success: true, message: `Clicked Save for ${targetDateStr}`, debug: debugLog.join(', ') };
    }

    return { success: false, message: `Could not find Save button for ${targetDateStr}`, debug: debugLog.join(', ') };
};

export const checkValidationErrors = (): { hasError: boolean; message?: string } => {
    // Look for validation summary
    const summary = document.querySelector('.ValidationSummaryList');
    if (summary) {
        const listItems = summary.querySelectorAll('li');
        const messages = Array.from(listItems).map(li => li.textContent?.trim()).filter(Boolean);
        if (messages.length > 0) {
            return { hasError: true, message: messages.join('; ') };
        }
    }

    // Also check for inline validators if they are visible
    const validators = Array.from(document.querySelectorAll('span[id*="RequiredFieldValidator"]'));
    const visibleValidators = validators.filter(v => {
        const style = window.getComputedStyle(v);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (visibleValidators.length > 0) {
        const msg = visibleValidators.map(v => v.textContent?.trim()).join(', ');
        return { hasError: true, message: msg };
    }

    return { hasError: false };
};
