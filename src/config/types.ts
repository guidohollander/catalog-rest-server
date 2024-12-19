import logger from '@/src/utils/logger';

export interface AppConfig {
    environment: 'development' | 'staging' | 'production';
    server: {
        port: number;
        host: string;
    };
    logging: {
        level: 'error' | 'warn' | 'info' | 'debug';
        format: 'json' | 'simple';
    };
    repositories: {
        excludedRepos: string[];
    };
    services: {
        svn: {
            protocol: string;
            baseUrl: string;
            username: string;
            password: string;
        };
        jenkins: {
            baseUrl: string;
            username: string;
            apiToken: string;
        };
    };
}

export function validateConfig(config: Partial<AppConfig>): config is AppConfig {
    const errors: string[] = [];

    // Server validation
    if (!config.server?.port) errors.push('Server port is required');
    if (!config.server?.host) errors.push('Server host is required');

    // Environment validation
    const validEnvironments = ['development', 'staging', 'production'];
    if (!config.environment || !validEnvironments.includes(config.environment)) {
        errors.push(`Invalid environment. Must be one of: ${validEnvironments.join(', ')}`);
    }

    // Logging validation
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!config.logging?.level || !validLogLevels.includes(config.logging.level)) {
        errors.push(`Invalid log level. Must be one of: ${validLogLevels.join(', ')}`);
    }

    if (errors.length > 0) {
        logger.error('Configuration Validation Errors:', { errors });
        return false;
    }

    return true;
}
