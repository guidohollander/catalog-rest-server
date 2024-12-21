'use client';

import { useEffect, useState } from 'react';

const VersionDisplay = () => {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        // Get version from environment variable
        const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
        setVersion(appVersion || 'Version not available');
    }, []);

    return (
        <div className="fixed bottom-4 right-4 text-sm text-gray-500">
            v{version}
        </div>
    );
};

export default VersionDisplay;
