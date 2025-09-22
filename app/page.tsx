'use client';

import { useEffect, useState } from 'react';
import VersionDisplay from './components/VersionDisplay';
import Link from 'next/link';
import ServiceIcon from './components/ServiceIcon';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(false);
  const [svnHealth, setSvnHealth] = useState<{ status: string; message: string; host: string } | null>(null);
  const [jenkinsHealth, setJenkinsHealth] = useState<{ status: string } | null>(null);
  const [jiraHealth, setJiraHealth] = useState<{ status: string; message: string } | null>(null);
  const [envHealth, setEnvHealth] = useState<{ status: boolean; missingEnvVars: string[] } | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Check all health endpoints in parallel
        const [healthResponse, svnHealthResponse, jenkinsHealthResponse, jiraHealthResponse, environmentResponse] = await Promise.allSettled([
          fetch('/api/health'),
          fetch('/api/svn/health'),
          fetch('/api/jenkins/health', { 
            method: 'GET',
            signal: AbortSignal.timeout(3000) // 3 second timeout
          }),
          fetch('/api/jira/health'),
          fetch('/api/environment')
        ]);


        // Process main health check
        if (healthResponse.status === 'fulfilled') {
          const envData = await healthResponse.value.json();
          setEnvHealth(envData);
          setIsLoading(false);
        } else {
          throw new Error('Health check failed');
        }

        // Process SVN health
        if (svnHealthResponse.status === 'fulfilled') {
          const svnData = await svnHealthResponse.value.json();
          setSvnHealth(svnData);
        } else {
          setSvnHealth({ status: 'error', message: 'SVN health check failed', host: '' });
        }

        // Process Jenkins health
        if (jenkinsHealthResponse.status === 'fulfilled') {
          const jenkinsData = await jenkinsHealthResponse.value.json();
          setJenkinsHealth(jenkinsData);
        } else {
          setJenkinsHealth({ status: 'error' });
        }

        // Process Jira health
        if (jiraHealthResponse.status === 'fulfilled') {
          if (jiraHealthResponse.value.ok) {
            const jiraData = await jiraHealthResponse.value.json();
            setJiraHealth(jiraData);
          } else {
            const errorData = await jiraHealthResponse.value.json();
            setJiraHealth({ 
              status: 'unhealthy', 
              message: errorData.message || 'Failed to connect to Jira' 
            });
          }
        } else {
          setJiraHealth({ 
            status: 'unhealthy', 
            message: 'Jira health check failed' 
          });
        }

        // Process Environment check
        if (environmentResponse.status === 'fulfilled') {
          const envData = await environmentResponse.value.json();
          setIsProduction(envData.isProduction);
        }

      } catch (error) {
        console.error('Health check error:', error);
        setError(error instanceof Error ? error.message : 'Failed to check service health');
        setIsLoading(false);
      }
    };

    checkHealth();
    // Refresh health status every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-[#1a1b26] text-white">
      <div className="w-full max-w-3xl space-y-8">
        {/* Health Section */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <ServiceIcon service="health" size={24} className="mr-2" />
              Health
            </h2>
            <span className="ml-2 text-xs px-2 py-0.5 rounded border border-gray-500 text-gray-400">
              public
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="w-16 text-gray-400">GET</span>
              <span>/api/health</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="w-16 text-gray-400">GET</span>
              <span>/api/jenkins/health</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="w-16 text-gray-400">GET</span>
              <span>/api/jira/health</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">GET</span>
                <span>/api/svn/health</span>
              </div>
              {!isLoading && (
                <div 
                  className={`status-indicator ${(!envHealth?.status || error) ? 'error' : ''}`} 
                  title={!envHealth?.status ? `Missing: ${envHealth?.missingEnvVars.join(', ')}` : 'All systems operational'}
                />
              )}
            </div>
          </div>
        </div>


        {/* Jenkins Services Section */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <ServiceIcon service="jenkins" size={30} className="mr-2" />
              Jenkins Services
            </h2>
            <span className="ml-2 text-xs px-2 py-0.5 rounded border border-gray-500 text-gray-400">
              auth
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/jenkins/build</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/jenkins/builds</span>
              </div>
              {jenkinsHealth && (
                <div className={`status-indicator ${jenkinsHealth.status !== 'ok' ? 'error' : ''}`}></div>
              )}
            </div>
          </div>
        </div>

        {/* Jira Services Section */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <ServiceIcon service="jira" size={24} className="mr-2" />
              Jira Services
            </h2>
            <span className="ml-2 text-xs px-2 py-0.5 rounded border border-gray-500 text-gray-400">
              auth
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/jira/update-fix-version</span>
              </div>
              {jiraHealth && (
                <div className={`status-indicator ${jiraHealth.status !== 'healthy' ? 'error' : ''}`}></div>
              )}
            </div>
          </div>
        </div>

        {/* SVN Services Section */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center">
              <ServiceIcon service="svn" size={24} className="mr-2" />
              SVN Services
            </h2>
            <span className="ml-2 text-xs px-2 py-0.5 rounded border border-gray-500 text-gray-400">
              auth
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/bulk-exists</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/copy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/exists</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/existing_component_versions</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/existing_solution_implementations</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/latest-revision</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/propset</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="w-16 text-gray-400">POST</span>
                <span>/api/svn/reset</span>
              </div>
              {svnHealth && (
                <div className={`status-indicator ${svnHealth.status !== 'healthy' ? 'error' : ''}`}></div>
              )}
            </div>
          </div>
        </div>

        {/* Version Section */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h2 className="text-2xl font-semibold flex items-center">
                <span className="mr-2">🔗</span>
                Version
              </h2>
              <div className="ml-4">
                <VersionDisplay />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/logs" className="text-gray-400 hover:text-white transition-colors" title="Live Logs Console (Authentication Required)">
                <span className="text-xl">📊🔒</span>
              </a>
              {!isProduction && (
                <>
                  <a href="/external-logs" className="text-gray-400 hover:text-white transition-colors" title="External Application Logs (Authentication Required)">
                    <span className="text-xl">📋🔒</span>
                  </a>
                  <a href="/combined-logs" className="text-gray-400 hover:text-white transition-colors" title="Combined Logs Console (Authentication Required)">
                    <span className="text-xl">🔗🔒</span>
                  </a>
                </>
              )}
              <a href="/docs" className="text-gray-400 hover:text-white transition-colors" title="Documentation">
                <span className="text-xl">📚</span>
              </a>
              <a href="/database-diagram" className="text-gray-400 hover:text-white transition-colors" title="Database Schema Diagram">
                <span className="text-xl">🗄️</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
