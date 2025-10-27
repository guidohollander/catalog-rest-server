'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChristmasCardRegistration() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/christmas-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you! Your Christmas card registration has been received. 🎄',
        });
        setFormData({
          name: '',
          email: '',
          address: '',
          city: '',
          postalCode: '',
          country: '',
          message: '',
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.message || 'Failed to submit registration. Please try again.',
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1b26] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white mb-4 flex items-center"
          >
            ← Back to Home
          </button>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center">
              🎄 Christmas Card Registration
            </h1>
            <p className="text-gray-400">Register to receive a Christmas card from Guido Hollander</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-lg p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john.doe@example.com"
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-2">
                Street Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main Street"
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium mb-2">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New York"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium mb-2">
                  Postal Code *
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10001"
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium mb-2">
                Country *
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="United States"
              />
            </div>

            {/* Optional Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a personal message..."
              />
            </div>

            {/* Submit Status */}
            {submitStatus && (
              <div
                className={`p-4 rounded-lg ${
                  submitStatus.type === 'success'
                    ? 'bg-green-900/50 border border-green-500 text-green-200'
                    : 'bg-red-900/50 border border-red-500 text-red-200'
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Register for Christmas Card 🎄'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
