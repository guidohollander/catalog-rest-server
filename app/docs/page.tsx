import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Service Catalog REST Server Documentation',
  description: 'Documentation for the Service Catalog REST Server API endpoints',
};

export default function DocsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24 bg-[#1a1b26] text-white">
      <div className="w-full max-w-4xl space-y-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Service Catalog REST Server</h1>

        <section className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Overview</h2>
          <p className="text-gray-300">
            The Service Catalog REST Server provides a centralized API for managing and interacting with various services
            including SVN, Jenkins, and Jira. It offers endpoints for health checks, version management, and service-specific
            operations.
          </p>
        </section>

        <section className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Authentication</h2>
          <p className="text-gray-300">
            Most endpoints require Basic Authentication. Include your credentials in the Authorization header:
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>Authorization: Basic base64(username:password)</code>
          </pre>
          <p className="text-gray-300">
            The following endpoints do not require authentication:
          </p>
          <ul className="list-disc list-inside text-gray-300 ml-4">
            <li>All health check endpoints (/api/*/health)</li>
            <li>Home page (/)</li>
            <li>Documentation (/docs)</li>
          </ul>
        </section>

        <section className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Services</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-blue-400">Jenkins Services</h3>
              <ul className="list-disc list-inside text-gray-300 ml-4 mt-2">
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">GET /api/jenkins/health</code> - Check Jenkins server health</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/jenkins/build</code> - Trigger a Jenkins build</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/jenkins/builds</code> - Get builds information</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-blue-400">Jira Services</h3>
              <ul className="list-disc list-inside text-gray-300 ml-4 mt-2">
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">GET /api/jira/health</code> - Check Jira server health</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/jira/update-fix-version</code> - Update fix version for Jira issues</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-blue-400">SVN Services</h3>
              <ul className="list-disc list-inside text-gray-300 ml-4 mt-2">
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">GET /api/svn/health</code> - Check SVN server health</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/bulk-exists</code> - Check existence of multiple SVN paths</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/copy</code> - Copy SVN resources</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/exists</code> - Check existence of SVN path</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/existing_component_versions</code> - Get existing component versions</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/existing_solution_implementations</code> - Get existing solution implementations</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/latest-revision</code> - Get latest revision information</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/propset</code> - Set SVN properties</li>
                <li><code className="text-sm bg-gray-900 px-2 py-1 rounded">POST /api/svn/reset</code> - Reset SVN state</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Health Checks</h2>
          <p className="text-gray-300">
            Health check endpoints are available for all services and do not require authentication. They return a status
            and additional information about the service health.
          </p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code>{JSON.stringify({
              status: 'healthy',
              message: 'Service is healthy',
              timestamp: new Date().toISOString()
            }, null, 2)}</code>
          </pre>
        </section>
      </div>
    </main>
  );
}
