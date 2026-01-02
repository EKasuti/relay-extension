import relayLogo from '/logo.png'
import LandingPage from './components/LandingPage'

function App() {
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  const handleOpenSidePanel = async () => {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.id !== undefined) {
        await chrome.sidePanel.open({ windowId: currentWindow.id });
      }
    } catch (error) {
      console.error('Failed to open side panel via Chrome API.', error);
    }
  }

  if (isExtension) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 w-64">
        <h1 className="text-2xl font-bold mb-4 text-blue-600">Relay Extension</h1>
        <div className="mb-6">
          <img src={relayLogo} className="h-16 w-16 hover:scale-110 transition-transform" alt="Relay logo" />
        </div>
        <div>
          <button
            onClick={handleOpenSidePanel}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors shadow-sm"
          >
            Open Side Panel
          </button>
        </div>
      </div>
    );
  }

  return <LandingPage />;
}

export default App
