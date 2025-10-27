'use client';

import { useState, useEffect } from 'react';

interface TimeZoneData {
  name: string;
  timezone: string;
  lat: number;
  lon: number;
  countryCode?: string;
  country?: string;
  population?: string;
  capital?: string;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

const TIMEZONES: TimeZoneData[] = [
  { 
    name: 'Local', 
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, 
    lat: 0, 
    lon: 0 
  },
  { 
    name: 'Curaçao', 
    timezone: 'America/Curacao', 
    lat: 12.1696, 
    lon: -68.9900,
    countryCode: 'CW',
    country: 'Curaçao',
    population: '~160,000',
    capital: 'Willemstad'
  },
  { 
    name: 'Medellín', 
    timezone: 'America/Bogota', 
    lat: 6.2476, 
    lon: -75.5658,
    countryCode: 'CO',
    country: 'Colombia',
    population: '~2.5M (city), ~51M (country)',
    capital: 'Bogotá'
  }
];

export default function WorldClock() {
  const [times, setTimes] = useState<Date[]>([]);
  const [weather, setWeather] = useState<{ [key: string]: WeatherData | null }>({});

  useEffect(() => {
    const updateTimes = () => {
      setTimes(TIMEZONES.map(() => new Date()));
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      for (const tz of TIMEZONES) {
        if (tz.name === 'Local') {
          // Skip weather for local timezone
          continue;
        }
        
        try {
          const response = await fetch(`/api/weather?lat=${tz.lat}&lon=${tz.lon}`);
          if (response.ok) {
            const data = await response.json();
            setWeather(prev => ({ ...prev, [tz.name]: data }));
          }
        } catch (error) {
          console.error(`Failed to fetch weather for ${tz.name}:`, error);
          setWeather(prev => ({ ...prev, [tz.name]: null }));
        }
      }
    };

    fetchWeather();
    // Update weather every 10 minutes
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  const getTimeInTimezone = (date: Date, timezone: string) => {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  };

  const renderAnalogClock = (date: Date, timezone: string) => {
    const time = getTimeInTimezone(date, timezone);
    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const secondAngle = (seconds * 6) - 90;
    const minuteAngle = (minutes * 6 + seconds * 0.1) - 90;
    const hourAngle = (hours * 30 + minutes * 0.5) - 90;

    return (
      <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
        {/* Clock face */}
        <circle cx="60" cy="60" r="58" fill="#2d3748" stroke="#4a5568" strokeWidth="2" />
        
        {/* Hour markers */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 60 + 48 * Math.cos(angle);
          const y1 = 60 + 48 * Math.sin(angle);
          const x2 = 60 + 52 * Math.cos(angle);
          const y2 = 60 + 52 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#718096"
              strokeWidth="2"
            />
          );
        })}

        {/* Hour hand */}
        <line
          x1="60"
          y1="60"
          x2={60 + 30 * Math.cos(hourAngle * Math.PI / 180)}
          y2={60 + 30 * Math.sin(hourAngle * Math.PI / 180)}
          stroke="#f7fafc"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Minute hand */}
        <line
          x1="60"
          y1="60"
          x2={60 + 40 * Math.cos(minuteAngle * Math.PI / 180)}
          y2={60 + 40 * Math.sin(minuteAngle * Math.PI / 180)}
          stroke="#e2e8f0"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Second hand */}
        <line
          x1="60"
          y1="60"
          x2={60 + 45 * Math.cos(secondAngle * Math.PI / 180)}
          y2={60 + 45 * Math.sin(secondAngle * Math.PI / 180)}
          stroke="#f56565"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle cx="60" cy="60" r="4" fill="#f56565" />
      </svg>
    );
  };

  const formatDigitalTime = (date: Date, timezone: string) => {
    const time = getTimeInTimezone(date, timezone);
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-semibold flex items-center">
          <span className="mr-2">🌍</span>
          World Clock & Weather
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIMEZONES.map((tz, index) => (
          <div key={tz.name} className="bg-gray-700 p-4 rounded-lg text-center">
            <h3 className="text-lg font-semibold mb-2">{tz.name}</h3>
            
            {/* Map for non-local locations */}
            {tz.countryCode && (
              <div className="mb-3">
                <img 
                  src={`https://flagcdn.com/w320/${tz.countryCode.toLowerCase()}.png`}
                  alt={`${tz.country} flag`}
                  className="w-16 h-auto mx-auto mb-2 rounded shadow-md"
                />
                <div className="relative w-full h-32 bg-gray-600 rounded overflow-hidden mb-2">
                  <img 
                    src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+f56565(${tz.lon},${tz.lat})/${tz.lon},${tz.lat},${tz.name === 'Curaçao' ? '8' : '10'},0/300x150@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`}
                    alt={`${tz.name} map`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to OpenStreetMap static map
                      e.currentTarget.src = `https://www.openstreetmap.org/export/embed.html?bbox=${tz.lon-1},${tz.lat-1},${tz.lon+1},${tz.lat+1}&layer=mapnik&marker=${tz.lat},${tz.lon}`;
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Analog Clock */}
            {times[index] && renderAnalogClock(times[index], tz.timezone)}
            
            {/* Digital Time */}
            <div className="mt-3 text-xl font-mono text-blue-300">
              {times[index] && formatDigitalTime(times[index], tz.timezone)}
            </div>
            
            {/* Location Info */}
            {tz.country && (
              <div className="mt-3 pt-3 border-t border-gray-600 text-left text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Country:</span>
                    <span className="font-semibold">{tz.country}</span>
                  </div>
                  {tz.capital && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Capital:</span>
                      <span className="font-semibold">{tz.capital}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Population:</span>
                    <span className="font-semibold">{tz.population}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Weather Info */}
            {tz.name !== 'Local' && weather[tz.name] && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather[tz.name]?.icon}@2x.png`}
                    alt="weather icon"
                    className="w-12 h-12"
                  />
                  <div className="text-left">
                    <div className="text-2xl font-bold">
                      {weather[tz.name]?.temp}°C
                    </div>
                    <div className="text-sm text-gray-400 capitalize">
                      {weather[tz.name]?.description}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {tz.name !== 'Local' && !weather[tz.name] && (
              <div className="mt-3 pt-3 border-t border-gray-600 text-gray-500 text-sm">
                Loading weather...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
