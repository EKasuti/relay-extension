# Relay Extension

Relay Extension is a Chrome extension designed to help manage shifts, parse PDF schedules from ConnectTeam, and simplify shift entry.

## Features

- **PDF Import**: Extract shift data directly from ConnectTeam export PDFs.
- **JobX Integration**: Sync active job titles directly from your Dartmouth JobX dashboard.
- **Smart Mapping**: Automatically map your imported shifts to official JobX job titles with a global mapping tool.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Use the latest LTS version recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EKasuti/relay-extension.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Development

To start the development server:

```bash
npm run dev
```

This will run the setup guide at `http://localhost:5173`. You can use this to verify the UI, but for full extension functionality (like `chrome` API access), you must load it into the browser.

## Building & Loading Extension

1. **Build the project**
   ```bash
   npm run build
   ```
   This creates a `dist` directory with the compiled extension files.

2. **Load into Chrome**
   - Open Chrome and navigate to `chrome://extensions`.
   - Toggle **Developer mode** in the top right corner.
   - Click **Load unpacked**.
   - Select the `dist` folder located in your project directory.

3. **Run**
   - Pin the extension to your toolbar.
   - Click the icon to open the side panel and start managing your shifts.

## Tech Stack

- **Vite** - Build tool and dev server
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **PDF.js** - PDF parsing