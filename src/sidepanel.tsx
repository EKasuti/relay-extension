import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import relayLogo from '/relay.svg'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <div className="flex flex-col items-center p-4 min-h-screen bg-gray-50">
            <h1 className="text-xl font-bold mb-4 text-blue-600">Relay Sidepanel</h1>
            <div className="mb-4">
                <img src={relayLogo} className="h-12 w-12 hover:scale-110 transition-transform" alt="Relay logo" />
            </div>
            <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-200">
                <p className="text-gray-700">This is the side panel content.</p>
            </div>
        </div>
    </StrictMode>,
)
