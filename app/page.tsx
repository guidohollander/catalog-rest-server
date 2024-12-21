'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Fireworks from './components/Fireworks';
import VersionDisplay from './components/VersionDisplay';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('Health check failed');
        }
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
      <Fireworks />
      
      <motion.h1 
        className="text-7xl font-bold mb-8 bg-gradient-to-r from-[#ff9a9e] to-[#ff3366] text-transparent bg-clip-text"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ 
          scale: [0.5, 1.2, 1],
          opacity: 1
        }}
        transition={{
          duration: 0.8,
          ease: "easeOut",
          times: [0, 0.7, 1]
        }}
      >
        Happy New Year 2025!
      </motion.h1>

      <div className="text-2xl text-center mb-8">
        Wishing you a fantastic holiday season from all of us at{' '}
        <span className="text-yellow-400">Hollander Consulting</span>
      </div>

      <div className="text-xl text-[#ff69b4] mb-16 flex items-center">
        <span role="img" aria-label="gift" className="mr-2">🎁</span>
        Get ready for an exciting 2025!
        <span role="img" aria-label="gift" className="ml-2">🎁</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        <div className="bg-[#1f2937] p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-yellow-400 mr-2">&lt;/&gt;</span>
            SVN Services
          </h2>
          <div className="text-gray-300">
            <p className="mb-2">Available endpoints:</p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/svn/repositories
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/svn/exists
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                /api/svn/copy
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-[#1f2937] p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-yellow-400 mr-2">👨‍💻</span>
            Jenkins Services
          </h2>
          <div className="text-gray-300">
            <p className="mb-2">Available endpoints:</p>
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
            Version
          </h2>
          <div className="text-gray-300">
            <p className="mb-2">Current version:</p>
            <VersionDisplay />
          </div>
        </div>
      </div>
    </main>
  );
}
