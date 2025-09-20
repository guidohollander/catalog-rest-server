'use client';

import { useEffect, useState } from 'react';

interface VersionDisplayProps {
    className?: string;
}

const VersionDisplay = ({ className = '' }: VersionDisplayProps) => {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        // Get version from environment variable
        const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
        setVersion(appVersion || 'Version not available');
    }, []);

    return (
        <div className={className}>
            v{version}
        </div>
    );
};

export default VersionDisplay;
