import type { Shift } from '../types';
import { DALI_BASE_URL } from '../config';

// DALI OS integration: pull the signed-in user's Timesheet-tab entries and turn
// them into Relay shifts, then let the normal JobX job-matching flow fill them.
//
// Auth reuses DALI's device-pairing flow (the same one the desktop app uses):
// the user approves once in a real DALI tab where they're already logged in,
// and we get back a long-lived bearer token — so there's no separate Relay
// credential. The token is stored in chrome.storage.local and sent as
// `Authorization: Bearer`. Cross-origin fetches work because the DALI origin is
// in manifest `host_permissions`.

const TOKEN_KEY = 'daliToken';

// ─── Shapes returned by DALI ────────────────────────────────────────────────

export interface DaliHire {
    key: string;
    label: string;
}

export interface DaliEntry {
    startAt: string; // ISO instant
    endAt: string; // ISO instant
    description: string;
    projectLabel: string;
}

export interface DaliTimesheet {
    hireKey: string;
    hireLabel: string;
    from: string;
    to: string;
    availableHires: DaliHire[];
    entries: DaliEntry[];
}

interface PairStartResponse {
    deviceCode: string;
    userCode: string;
    verificationUrl: string;
    expiresIn: number;
    interval: number;
}

interface PairPollResponse {
    status:
        | 'pending'
        | 'slow_down'
        | 'approved'
        | 'denied'
        | 'expired'
        | 'already_used';
    desktopToken?: string;
    interval?: number;
}

// ─── Token storage ──────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
    const stored = await chrome.storage.local.get(TOKEN_KEY);
    const token = stored[TOKEN_KEY];
    return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function setToken(token: string): Promise<void> {
    await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearToken(): Promise<void> {
    await chrome.storage.local.remove(TOKEN_KEY);
}

// ─── Pairing flow ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs the full device-pairing handshake and stores the resulting bearer token.
 * Opens the DALI approval page in a new tab; `onCode` is called with the human
 * pairing code to display while the user approves. Resolves once approved (the
 * token is stored), rejects on denial/expiry/timeout.
 */
export async function connect(onCode: (userCode: string) => void): Promise<void> {
    const startRes = await fetch(`${DALI_BASE_URL}/auth/pair/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceLabel: 'Relay Extension' }),
    });
    if (!startRes.ok) throw new Error('Could not start DALI pairing. Try again.');
    const start = (await startRes.json()) as PairStartResponse;

    onCode(start.userCode);

    // Open the approval page in a real tab where the user is (or can get) logged
    // into DALI and can eyeball-compare the code.
    await chrome.tabs.create({ url: start.verificationUrl });

    const deadline = Date.now() + start.expiresIn * 1000;
    let interval = Math.max(start.interval, 1);

    while (Date.now() < deadline) {
        await sleep(interval * 1000);
        const pollRes = await fetch(`${DALI_BASE_URL}/auth/pair/poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceCode: start.deviceCode }),
        });
        if (!pollRes.ok) continue; // transient; keep polling until the deadline
        const poll = (await pollRes.json()) as PairPollResponse;

        switch (poll.status) {
            case 'approved':
                if (!poll.desktopToken) throw new Error('Pairing approved but no token returned.');
                await setToken(poll.desktopToken);
                return;
            case 'denied':
                throw new Error('Pairing was cancelled.');
            case 'expired':
                throw new Error('Pairing code expired. Please try again.');
            case 'already_used':
                throw new Error('This pairing request was already used. Please try again.');
            case 'slow_down':
                interval += 2;
                break;
            case 'pending':
            default:
                if (poll.interval) interval = Math.max(poll.interval, 1);
                break;
        }
    }
    throw new Error('Pairing timed out. Please try again.');
}

// ─── Timesheet fetch ────────────────────────────────────────────────────────

export class DaliAuthError extends Error {}
export class DaliEmptyError extends Error {}

/**
 * Fetch the user's timesheet entries for one hire (job) and date range. Throws
 * DaliAuthError on 401 (token expired/revoked — caller should re-pair) and
 * DaliEmptyError on 404 (no entries in range).
 */
export async function fetchTimesheet(
    token: string,
    opts: { from?: string; to?: string; hire?: string } = {},
): Promise<DaliTimesheet> {
    const params = new URLSearchParams();
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    if (opts.hire) params.set('hire', opts.hire);
    const qs = params.toString();

    const res = await fetch(
        `${DALI_BASE_URL}/api/timesheets/export${qs ? `?${qs}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 401) throw new DaliAuthError('Your DALI session expired. Reconnect to continue.');
    if (res.status === 404) throw new DaliEmptyError('No timesheet entries in that range.');
    if (!res.ok) throw new Error('Could not load your DALI timesheet.');
    return (await res.json()) as DaliTimesheet;
}

// ─── Mapping to Relay shifts (pure — unit tested) ───────────────────────────

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * Convert DALI timesheet entries into Relay shifts. Times are rendered in the
 * browser's local timezone, which for DALI (Dartmouth) users matches the tz the
 * entries were recorded in. The hire label becomes the shift's job title, which
 * the user then maps to a JobX job title in the matching step.
 */
export function entriesToShifts(sheet: DaliTimesheet): Shift[] {
    return sheet.entries.map((e) => {
        const start = new Date(e.startAt);
        const end = new Date(e.endAt);
        const totalHours =
            Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 100) / 100;
        return {
            date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
            startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
            endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
            totalHours,
            jobTitle: sheet.hireLabel || e.projectLabel,
            description: e.description || undefined,
            isMigrated: false,
        };
    });
}
