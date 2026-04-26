'use client';

import { useEffect, useState } from 'react';

interface VersionDisplayProps {
    className?: string;
}

const VersionDisplay = ({ className = '' }: VersionDisplayProps) => {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
        const hasConcreteEnvVersion =
            typeof appVersion === 'string' &&
            appVersion.trim().length > 0 &&
            appVersion !== 'not set' &&
            !appVersion.includes('%npm_package_version%') &&
            !appVersion.includes('$npm_package_version');

        if (hasConcreteEnvVersion) {
            setVersion(appVersion);
            return;
        }

        const loadVersion = async () => {
            try {
                const response = await fetch('/api/version', { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`Version API returned ${response.status}`);
                }

                const data = await response.json();
                const fallbackVersion =
                    typeof data?.envVersion === 'string' &&
                    data.envVersion !== 'not set' &&
                    data.envVersion.trim().length > 0 &&
                    !data.envVersion.includes('%npm_package_version%') &&
                    !data.envVersion.includes('$npm_package_version')
                        ? data.envVersion
                        : data?.version;

                setVersion(typeof fallbackVersion === 'string' && fallbackVersion.trim().length > 0 ? fallbackVersion : 'Version not available');
            } catch {
                setVersion('Version not available');
            }
        };

        void loadVersion();
    }, []);

    return (
        <div className={className}>
            v{version}
        </div>
    );
};

export default VersionDisplay;
