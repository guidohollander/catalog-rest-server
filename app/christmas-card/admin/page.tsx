'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Registration {
  timestamp: string;
  name: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  message: string;
}

export default function ChristmasCardAdmin() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/christmas-card');
      const data = await response.json();
      
      if (data.success) {
        setRegistrations(data.registrations);
      } else {
        setError('Failed to load registrations');
      }
    } catch (err) {
      setError('Error fetching registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Name', 'Email', 'Address', 'City', 'Postal Code', 'Country', 'Message'];
    const rows = registrations.map(reg => [
      new Date(reg.timestamp).toLocaleString(),
      reg.name,
      reg.email,
      reg.address,
      reg.city,
      reg.postalCode,
      reg.country,
      reg.message || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `christmas-card-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#1a1b26] text-white p-8">
        <div className="max-w-6xl mx-auto text-center">
          <p>Loading registrations...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1a1b26] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white mb-4 flex items-center"
          >
            ← Back to Home
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                🎄 Christmas Card Registrations Admin
              </h1>
              <p className="text-gray-400">Total registrations: {registrations.length}</p>
            </div>
            {registrations.length > 0 && (
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Export to CSV
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Registrations Table */}
        {registrations.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No registrations yet.</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">City</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Postal Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Country</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {registrations.map((reg, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(reg.timestamp).toLocaleDateString()}<br />
                        <span className="text-xs text-gray-500">
                          {new Date(reg.timestamp).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{reg.name}</td>
                      <td className="px-4 py-3 text-sm text-blue-400">{reg.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{reg.address}</td>
                      <td className="px-4 py-3 text-sm">{reg.city}</td>
                      <td className="px-4 py-3 text-sm">{reg.postalCode}</td>
                      <td className="px-4 py-3 text-sm">{reg.country}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                        {reg.message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
