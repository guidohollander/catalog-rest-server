import { FaServer, FaJenkins, FaCode, FaDatabase, FaCheckCircle } from 'react-icons/fa';
import { BiGitBranch } from 'react-icons/bi';
import { VersionDisplay } from './components/VersionDisplay';

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Service Catalog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-inter">
            Your central hub for managing services, repositories, and build information
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* SVN Section */}
          <div className="service-card">
            <div className="flex items-center mb-4">
              <FaCode className="card-icon text-blue-500" />
              <h2 className="card-title">SVN Services</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 font-inter">Available endpoints:</p>
              <ul className="feature-list">
                <li className="feature-item">
                  <FaCheckCircle className="text-green-500" />
                  <span>/api/svn/repositories</span>
                </li>
                <li className="feature-item">
                  <FaCheckCircle className="text-green-500" />
                  <span>/api/svn/info</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Jenkins Section */}
          <div className="service-card">
            <div className="flex items-center mb-4">
              <FaJenkins className="card-icon text-red-500" />
              <h2 className="card-title">Jenkins Builds</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 font-inter">Build management:</p>
              <ul className="feature-list">
                <li className="feature-item">
                  <FaCheckCircle className="text-green-500" />
                  <span>/api/jenkins/builds</span>
                </li>
                <li className="feature-item">
                  <FaCheckCircle className="text-green-500" />
                  <span>/api/jenkins/status</span>
                </li>
              </ul>
            </div>
          </div>

          {/* System Status */}
          <div className="service-card">
            <div className="flex items-center mb-4">
              <FaServer className="card-icon text-purple-500" />
              <h2 className="card-title">System Status</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 font-inter">Health monitoring:</p>
              <ul className="feature-list">
                <li className="feature-item">
                  <FaCheckCircle className="text-green-500" />
                  <span>/api/health</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-16 service-card max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <BiGitBranch className="text-3xl mr-3 text-indigo-500" />
            <h2 className="text-3xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              API Documentation
            </h2>
          </div>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6 font-inter">
              This service catalog provides RESTful APIs for managing SVN repositories and Jenkins builds.
              All endpoints require authentication using the provided API key.
            </p>
            <div className="bg-indigo-50/50 rounded-lg p-6 border border-indigo-100">
              <h3 className="text-lg font-semibold text-indigo-900 mb-3">Authentication</h3>
              <p className="text-gray-700 font-inter">
                Include your API key in the request headers:
                <code className="bg-white text-sm px-3 py-1 rounded ml-2 text-indigo-600 border border-indigo-100">
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
