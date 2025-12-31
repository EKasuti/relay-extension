import relayLogo from '/relay.svg'
import './App.css'

function App() {

  const handleOpenSidePanel = async () => {
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.id) {
      // Opens the side panel for the current window
      chrome.sidePanel.open({ windowId: currentWindow.id });
    }
  }

  return (
    <>
      <h1>Relay Extension</h1>
      <div>
        <a target="_blank">
          <img src={relayLogo} className="logo" alt="Relay logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={handleOpenSidePanel}>
          Open Side Panel
        </button>
      </div>
    </>
  )
}

export default App
