import { FaServer, FaJenkins, FaCode, FaDatabase, FaCheckCircle } from 'react-icons/fa';
import { BiGitBranch } from 'react-icons/bi';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Service Catalog</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your central hub for managing services, repositories, and build information
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* SVN Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all hover:scale-105">
            <div className="flex items-center mb-4">
              <FaCode className="text-blue-500 text-2xl mr-3" />
              <h2 className="text-2xl font-semibold text-gray-800">SVN Services</h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-600">Available endpoints:</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <span>/api/svn/repositories</span>
                </li>
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <span>/api/svn/info</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Jenkins Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all hover:scale-105">
            <div className="flex items-center mb-4">
              <FaJenkins className="text-red-500 text-2xl mr-3" />
              <h2 className="text-2xl font-semibold text-gray-800">Jenkins Builds</h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-600">Build management:</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <span>/api/jenkins/builds</span>
                </li>
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <span>/api/jenkins/status</span>
                </li>
              </ul>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all hover:scale-105">
            <div className="flex items-center mb-4">
              <FaServer className="text-purple-500 text-2xl mr-3" />
              <h2 className="text-2xl font-semibold text-gray-800">System Status</h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-600">Health monitoring:</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <span>/api/health</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <BiGitBranch className="text-indigo-500 text-3xl mr-3" />
            <h2 className="text-3xl font-semibold text-gray-800">API Documentation</h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              This service catalog provides RESTful APIs for managing SVN repositories and Jenkins builds.
              All endpoints require authentication using the provided API key.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Authentication</h3>
              <p className="text-gray-600">
                Include your API key in the request headers:
                <code className="bg-gray-100 text-sm px-2 py-1 rounded ml-2">
                  X-API-Key: your-api-key
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
