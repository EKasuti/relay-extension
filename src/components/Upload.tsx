import React, { useState } from 'react';
import type { Shift } from '../types';
import { parseShiftsFromPdf } from '../utils/pdfParser';

interface UploadProps {
    onBack: () => void;
    onShiftsParsed: (shifts: Shift[]) => void;
}

const Upload: React.FC<UploadProps> = ({ onBack, onShiftsParsed }) => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('');
        }
    };

    const handleImport = async () => {
        if (!file) {
            setStatus('Please select a PDF file first.');
            return;
        }

        setStatus('Parsing PDF...');
        try {
            const parsedShifts = await parseShiftsFromPdf(file);
            onShiftsParsed(parsedShifts);
            // Status and file reset might be handled by parent or unmounting, but let's keep it clean
            setStatus(`Successfully parsed ${parsedShifts.length} shifts.`);
        } catch (error) {
            console.error(error);
            setStatus('Failed to parse PDF. Please ensure the file is a valid ConnectTeam export.');
        }
    };

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 mb-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Upload PDF</h2>
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">Back</button>
            </div>
            <div className="mb-4">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                />
            </div>
            <button
                onClick={handleImport}
                disabled={!file}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
            >
                Import Parsed Shifts
            </button>
            {status && <div className={`mt-3 text-sm p-2 rounded ${status.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{status}</div>}
        </div>
    );
};

export default Upload;
