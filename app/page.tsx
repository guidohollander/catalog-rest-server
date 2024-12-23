'use client';

import { useEffect, useState } from 'react';
import VersionDisplay from './components/VersionDisplay';
import Link from 'next/link';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svnHealth, setSvnHealth] = useState<{ status: string; message: string; host: string } | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const [healthResponse, svnHealthResponse] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/svn/health')
        ]);

        if (!healthResponse.ok) {
          throw new Error('Health check failed');
        }

        const svnData = await svnHealthResponse.json();
        setSvnHealth(svnData);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    checkHealth();
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
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[#1a1b26] text-white">
      <div className="grid grid-cols-1 gap-8 w-full max-w-2xl">
        <h1 className="text-4xl font-bold">service catalog REST server</h1>
        
        <div className="bg-[#1f2937] p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-red-400 mr-2">❤️</span>
            health
          </h2>
          <div className="text-gray-300">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/health
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-[#1f2937] p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-yellow-400 mr-2">&lt;/&gt;</span>
            svn services
          </h2>
          <div className="text-gray-300">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/svn/repositories
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/svn/exists
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  /api/svn/copy
                </div>
                <div 
                  className={`w-4 h-4 rounded-full ${svnHealth?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}
                  title={`SVN Status: ${svnHealth?.status || 'Unknown'}\nHost: ${svnHealth?.host || 'Unknown'}`}
                />
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-[#1f2937] p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-yellow-400 mr-2">👨‍💻</span>
            jenkins services
          </h2>
          <div className="text-gray-300">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/jenkins/builds
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/jenkins/build
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/jenkins/ping
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-[#1f2937] p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-yellow-400 mr-2">🔗</span>
            version
          </h2>
          <div className="text-gray-300">
            <div className="bg-white/10 px-3 py-1 rounded-full inline-block">
              <VersionDisplay />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <Link href="/docs" className="text-blue-400 hover:text-blue-300 flex items-center">
          <span className="mr-2">📚</span>
          View Documentation
        </Link>
      </div>
      <VersionDisplay className="fixed bottom-4 right-4 text-sm text-gray-500" />
    </main>
  );
}
