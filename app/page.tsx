export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-6">Service Catalog</h1>
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
        <p className="text-lg text-gray-700 mb-4">
          Welcome to the Service Catalog management system. 
          This application helps you track and manage various services, 
          repositories, and build information.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-100 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">SVN Repositories</h2>
            <p>View and manage SVN repository information</p>
          </div>
          <div className="bg-green-100 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Jenkins Builds</h2>
            <p>Track build status and history</p>
          </div>
        </div>
      </div>
    </div>
  )
}
