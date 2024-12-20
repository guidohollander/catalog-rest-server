'use client';

// Import version from environment variable
const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.23';

export function VersionDisplay() {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-600 font-mono">
      v{version}
    </div>
  );
}
