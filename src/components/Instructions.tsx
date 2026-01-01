import React from 'react';

interface InstructionsProps {
    onBack: () => void;
    onNext: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({ onBack, onNext }) => {
    return (
        <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200 mb-4 animate-fadeIn">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">ConnectTeam Import</h2>
            <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>1. Go to your ConnectTeam Timesheets.</p>
                <p>2. Navigate to the <strong>Operations</strong> tab and click <strong>Time Clock</strong>.</p>
                <p>3. Select range of date you want to export.</p>
                <p>4. Click <strong>Export</strong> and the file will be automatically downloaded.</p>
                <p>5. Check your downloads folder for the file.</p>
            </div>
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">Back</button>
                <button
                    onClick={onNext}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Next: Upload PDF
                </button>
            </div>
        </div>
    );
};

export default Instructions;
