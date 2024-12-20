// Import package.json using require to avoid named export warning
const { version } = require('../../package.json') as { version: string };

export function VersionDisplay() {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-600 font-mono">
      v{version}
    </div>
  );
}
