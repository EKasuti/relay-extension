import relayLogo from '/relay.svg'
import './App.css'

function App() {

  const onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true  });
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        alert('Hello from Relay extension!');
      }
    })
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
        <button onClick={onclick}>
          Click Me
        </button>
      </div>
    </>
  )
}

export default App
