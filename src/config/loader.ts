import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppConfig, validateConfig } from './types';

// Load environment variables
dotenv.config();

export function loadConfig(): AppConfig {
    const env = process.env.NODE_ENV || 'development';
    const configDir = path.join(process.cwd(), 'config');

    // Load default configuration
    const defaultConfigPath = path.join(configDir, 'default.json');
    const envConfigPath = path.join(configDir, `${env}.json`);

    try {
        // Read and parse default config
        const defaultRawConfig = fs.readFileSync(defaultConfigPath, 'utf-8');
        const defaultConfig = JSON.parse(defaultRawConfig);

        // Read and parse environment-specific config (if exists)
        let envConfig = {};
        if (fs.existsSync(envConfigPath)) {
            const envRawConfig = fs.readFileSync(envConfigPath, 'utf-8');
            envConfig = JSON.parse(envRawConfig);
        }

        // Deep merge configurations
        const mergedConfig = deepMerge(defaultConfig, envConfig);

        // Replace environment variable placeholders
        const processedConfig = replaceEnvVars(mergedConfig);

        // Validate configuration
        if (!validateConfig(processedConfig)) {
            throw new Error('Invalid configuration');
        }

        return processedConfig as AppConfig;
    } catch (error) {
        console.error('Failed to load configuration:', error);
        process.exit(1);
    }
}

// Deep merge utility function
function deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

// Check if value is an object
function isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
}

// Replace environment variable placeholders
function replaceEnvVars(config: any): any {
    const configString = JSON.stringify(config);
    const replacedConfigString = configString.replace(
        /\${([^}]+)}/g, 
        (_, envVar) => process.env[envVar] || ''
    );
    return JSON.parse(replacedConfigString);
}

// Optional: Load environment-specific overrides
export function loadEnvironmentOverrides(config: AppConfig): AppConfig {
    return {
        ...config,
        services: {
            ...config.services,
            svn: {
                ...config.services.svn,
                username: process.env.SVN_USERNAME || config.services.svn.username,
                password: process.env.SVN_PASSWORD || config.services.svn.password
            },
            jenkins: {
                ...config.services.jenkins,
                username: process.env.JENKINS_USERNAME || config.services.jenkins.username,
                apiToken: process.env.JENKINS_API_TOKEN || config.services.jenkins.apiToken
            }
        }
    };
}
