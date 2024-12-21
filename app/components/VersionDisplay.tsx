'use client';

import { useEffect, useState } from 'react';

export function VersionDisplay() {
  const [version, setVersion] = useState(process.env.NEXT_PUBLIC_APP_VERSION || '');

  useEffect(() => {
    // Update version from runtime environment
    setVersion(process.env.NEXT_PUBLIC_APP_VERSION || '');
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-600 font-mono">
      v{version}
    </div>
  );
}
