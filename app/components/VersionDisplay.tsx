'use client';

import { useEffect, useState } from 'react';

interface VersionDisplayProps {
    className?: string;
}

const VersionDisplay = ({ className = '' }: VersionDisplayProps) => {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        // Get version from environment variable or fetch from API
        const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
        if (appVersion && appVersion !== 'undefined') {
            setVersion(appVersion);
        } else {
            // Fallback: get version from package.json via API
            fetch('/api/version')
                .then(response => response.json())
                .then(data => {
                    setVersion(data.version || 'Version not available');
                })
                .catch(() => {
                    setVersion('Version not available');
                });
        }
    }, []);

    return (
        <div className={className}>
            v{version}
        </div>
    );
};

export default VersionDisplay;
