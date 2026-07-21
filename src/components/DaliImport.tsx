import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, LogOut, RefreshCw } from 'lucide-react';
import type { Shift } from '../types';
import {
    connect,
    clearToken,
    fetchTimesheet,
    entriesToShifts,
    getToken,
    DaliAuthError,
    DaliEmptyError,
    type DaliTimesheet,
} from '../utils/dali';

interface DaliImportProps {
    onBack: () => void;
    onShiftsParsed: (shifts: Shift[]) => void;
}

const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Status = 'loading' | 'need-connect' | 'connecting' | 'ready' | 'importing';

const DaliImport: React.FC<DaliImportProps> = ({ onBack, onShiftsParsed }) => {
    const [status, setStatus] = useState<Status>('loading');
    const [error, setError] = useState<string | null>(null);
    const [userCode, setUserCode] = useState<string | null>(null);
    const [sheet, setSheet] = useState<DaliTimesheet | null>(null);
    const [selectedHire, setSelectedHire] = useState<string>('');

    const today = new Date();
    const [from, setFrom] = useState(ymd(new Date(today.getTime() - 30 * 86_400_000)));
    const [to, setTo] = useState(ymd(today));

    const rangeParams = useCallback(
        (hire?: string) => ({
            from: `${from}T00:00:00`,
            to: `${to}T23:59:59`,
            ...(hire ? { hire } : {}),
        }),
        [from, to],
    );

    // Load the timesheet for the current token/range. Returns 'empty' when there
    // are no entries (so the picker still renders and the user can adjust dates).
    const load = useCallback(
        async (hire?: string) => {
            const token = await getToken();
            if (!token) {
                setStatus('need-connect');
                return;
            }
            try {
                const data = await fetchTimesheet(token, rangeParams(hire));
                setSheet(data);
                setSelectedHire(data.hireKey);
                setStatus('ready');
                setError(null);
            } catch (e) {
                if (e instanceof DaliAuthError) {
                    await clearToken();
                    setStatus('need-connect');
                } else if (e instanceof DaliEmptyError) {
                    setSheet(null);
                    setStatus('ready');
                    setError(null);
                } else {
                    setError(e instanceof Error ? e.message : 'Something went wrong');
                    setStatus('ready');
                }
            }
        },
        [rangeParams],
    );

    useEffect(() => {
        void (async () => {
            const token = await getToken();
            if (!token) {
                setStatus('need-connect');
                return;
            }
            await load();
        })();
        // Run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnect = async () => {
        setStatus('connecting');
        setError(null);
        setUserCode(null);
        try {
            await connect((code) => setUserCode(code));
            setUserCode(null);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Pairing failed');
            setUserCode(null);
            setStatus('need-connect');
        }
    };

    const handleDisconnect = async () => {
        await clearToken();
        setSheet(null);
        setSelectedHire('');
        setStatus('need-connect');
    };

    const handleImport = async () => {
        const token = await getToken();
        if (!token) {
            setStatus('need-connect');
            return;
        }
        setStatus('importing');
        setError(null);
        try {
            const data = await fetchTimesheet(token, rangeParams(selectedHire || undefined));
            const shifts = entriesToShifts(data);
            if (shifts.length === 0) {
                setError('No timesheet entries in that range.');
                setStatus('ready');
                return;
            }
            onShiftsParsed(shifts);
        } catch (e) {
            if (e instanceof DaliAuthError) {
                await clearToken();
                setStatus('need-connect');
            } else if (e instanceof DaliEmptyError) {
                setError('No timesheet entries in that range.');
                setStatus('ready');
            } else {
                setError(e instanceof Error ? e.message : 'Import failed');
                setStatus('ready');
            }
        }
    };

    return (
        <div className="w-full max-w-sm bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
                <button
                    onClick={onBack}
                    className="p-1 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
                    title="Back"
                >
                    <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">Import from DALI OS</h2>
            </div>

            {error && (
                <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                    {error}
                </div>
            )}

            {status === 'loading' && <p className="text-sm text-gray-500">Loading…</p>}

            {status === 'need-connect' && (
                <div className="text-center py-2">
                    <p className="text-sm text-gray-600 mb-4">
                        Connect your DALI OS account to pull your logged hours. You'll approve
                        it once in a DALI tab — no separate password.
                    </p>
                    <button
                        onClick={handleConnect}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                    >
                        Connect DALI OS
                    </button>
                </div>
            )}

            {status === 'connecting' && (
                <div className="text-center py-2">
                    <p className="text-sm text-gray-600 mb-2">
                        Approve in the DALI tab that just opened.
                    </p>
                    {userCode && (
                        <>
                            <p className="text-xs text-gray-500 mb-1">Confirm this code matches:</p>
                            <span className="inline-block rounded-md bg-gray-100 px-3 py-1.5 font-mono text-lg font-semibold tracking-widest text-gray-900">
                                {userCode}
                            </span>
                        </>
                    )}
                    <p className="text-xs text-gray-400 mt-3">Waiting for approval…</p>
                </div>
            )}

            {(status === 'ready' || status === 'importing') && (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-gray-500">
                            From
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </label>
                        <label className="text-xs text-gray-500">
                            To
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </label>
                    </div>

                    <button
                        onClick={() => void load(selectedHire || undefined)}
                        className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                        <RefreshCw size={13} /> Refresh hours for this range
                    </button>

                    {sheet && sheet.availableHires.length > 0 ? (
                        <>
                            <label className="text-xs text-gray-500">
                                Job (hire)
                                <select
                                    value={selectedHire}
                                    onChange={(e) => {
                                        setSelectedHire(e.target.value);
                                        void load(e.target.value);
                                    }}
                                    className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                                >
                                    {sheet.availableHires.map((h) => (
                                        <option key={h.key} value={h.key}>
                                            {h.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar size={13} />
                                {sheet.entries.length} entr{sheet.entries.length === 1 ? 'y' : 'ies'} in range
                            </div>

                            <button
                                onClick={() => void handleImport()}
                                disabled={status === 'importing' || sheet.entries.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                            >
                                {status === 'importing'
                                    ? 'Importing…'
                                    : `Import ${sheet.entries.length} shift${sheet.entries.length === 1 ? '' : 's'}`}
                            </button>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 italic">
                            No timesheet entries in this range. Adjust the dates above.
                        </p>
                    )}

                    <button
                        onClick={() => void handleDisconnect()}
                        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-600 mt-1"
                    >
                        <LogOut size={13} /> Disconnect DALI OS
                    </button>
                </div>
            )}
        </div>
    );
};

export default DaliImport;
