import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import relayLogo from '/relay.svg'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <>
            <h1>Relay Sidepanel</h1>
            <div>
                <a target="_blank">
                    <img src={relayLogo} className="logo" alt="Relay logo" />
                </a>
            </div>
            <div className="card">
                <p>This is the side panel content.</p>
            </div>
        </>
    </StrictMode>,
)
