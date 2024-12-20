import { FaServer, FaJenkins, FaCode, FaDatabase, FaCheckCircle, FaGift } from 'react-icons/fa';
import { BiGitBranch } from 'react-icons/bi';
import { VersionDisplay } from './components/VersionDisplay';
import { Fireworks } from './components/Fireworks';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <Fireworks />
      <div className="container mx-auto px-4 py-16">
        {/* New Year's Message */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-pink-500/10 to-purple-500/10 blur-3xl -z-10" />
          <h1 className="text-7xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-8 animate-pulse">
            Happy New Year 2025!
          </h1>
          <div className="space-y-6">
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto font-inter leading-relaxed">
              Wishing you a fantastic holiday season from all of us at
              <span className="font-semibold text-yellow-400"> Hollander Consulting</span>
            </p>
            <div className="flex items-center justify-center space-x-2 text-xl text-gray-400 max-w-2xl mx-auto font-inter italic">
              <FaGift className="text-pink-500 animate-bounce" />
              <span>Get ready for an exciting 2025!</span>
              <FaGift className="text-pink-500 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Service Cards with Dark Theme */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* SVN Section */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:border-yellow-500/50">
            <div className="flex items-center mb-4">
              <FaCode className="text-3xl mr-3 text-yellow-400" />
              <h2 className="text-xl font-semibold text-gray-100">SVN Services</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 font-inter">Available endpoints:</p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-gray-300">
                  <FaCheckCircle className="text-green-400" />
                  <span>/api/svn/repositories</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-300">
                  <FaCheckCircle className="text-green-400" />
                  <span>/api/svn/info</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Jenkins Section */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:border-pink-500/50">
            <div className="flex items-center mb-4">
              <FaJenkins className="text-3xl mr-3 text-pink-400" />
              <h2 className="text-xl font-semibold text-gray-100">Jenkins Builds</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 font-inter">Build management:</p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-gray-300">
                  <FaCheckCircle className="text-green-400" />
                  <span>/api/jenkins/builds</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-300">
                  <FaCheckCircle className="text-green-400" />
                  <span>/api/jenkins/status</span>
                </li>
              </ul>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-gray-700/50 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:border-purple-500/50">
            <div className="flex items-center mb-4">
              <FaServer className="text-3xl mr-3 text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-100">System Status</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 font-inter">Health monitoring:</p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-gray-300">
                  <FaCheckCircle className="text-green-400" />
                  <span>/api/health</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-16 bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 shadow-lg border border-gray-700/50 max-w-4xl mx-auto transform hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:border-indigo-500/50">
          <div className="flex items-center mb-6">
            <BiGitBranch className="text-3xl mr-3 text-indigo-400" />
            <h2 className="text-3xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              API Documentation
            </h2>
          </div>
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6 font-inter">
              This service catalog provides RESTful APIs for managing SVN repositories and Jenkins builds.
              All endpoints require authentication using the provided API key.
            </p>
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-indigo-300 mb-3">Authentication</h3>
              <p className="text-gray-300 font-inter">
                Include your API key in the request headers:
                <code className="bg-gray-800 text-sm px-3 py-1 rounded ml-2 text-pink-400 border border-gray-700">
                  X-API-Key: your-api-key
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
      <VersionDisplay />
    </main>
  )
}
