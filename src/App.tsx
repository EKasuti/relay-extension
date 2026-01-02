import relayLogo from '/logo.png'

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
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Open Side Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans text-gray-800">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={relayLogo} className="h-16 w-16 mb-4 hover:scale-110 transition-transform" alt="Relay logo" />
          <h1 className="text-3xl font-bold text-blue-600">Relay Extension Setup</h1>
          <p className="text-gray-500 mt-2">Follow these steps to install and run the extension locally.</p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">1</div>
            <div>
              <h3 className="font-semibold text-lg">Build the Project</h3>
              <p className="text-sm text-gray-600 mb-2">Open your terminal and run:</p>
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono block w-fit">npm run build</code>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">2</div>
            <div>
              <h3 className="font-semibold text-lg">Open Chrome Extensions</h3>
              <p className="text-sm text-gray-600">
                Go to <code className="bg-gray-100 px-1 py-0.5 rounded text-xs select-all">chrome://extensions</code> in your browser.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">3</div>
            <div>
              <h3 className="font-semibold text-lg">Enable Developer Mode</h3>
              <p className="text-sm text-gray-600">Toggle the switch in the top-right corner of the Extensions page.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">4</div>
            <div>
              <h3 className="font-semibold text-lg">Load Unpacked</h3>
              <p className="text-sm text-gray-600">Click the <strong>Load unpacked</strong> button and select the <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">dist</code> folder from this project.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">5</div>
            <div>
              <h3 className="font-semibold text-lg">Pin & Run</h3>
              <p className="text-sm text-gray-600">Pin the Relay Extension to your toolbar and click it to open the sidepanel.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">Current version: 0.0.0 (Dev)</p>
        </div>
      </div>
    </div>
  )
}

export default App
