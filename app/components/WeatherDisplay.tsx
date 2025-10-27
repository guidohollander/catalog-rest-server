'use client';

import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
}

export default function WeatherDisplay() {
  const [localWeather, setLocalWeather] = useState<WeatherData | null>(null);
  const [curacaoWeather, setCuracaoWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get user's location first
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        // Fetch local weather
        const localResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`
        );
        
        if (!localResponse.ok) {
          throw new Error('Failed to fetch local weather');
        }
        
        const localData = await localResponse.json();
        setLocalWeather({
          temperature: localData.current.temperature_2m,
          weatherCode: localData.current.weather_code,
          isDay: localData.current.is_day === 1
        });

        // Fetch Curacao weather (Willemstad coordinates: 12.1167°N, 68.9333°W)
        const curacaoResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=12.1167&longitude=-68.9333&current=temperature_2m,weather_code,is_day&timezone=auto`
        );
        
        if (!curacaoResponse.ok) {
          throw new Error('Failed to fetch Curacao weather');
        }
        
        const curacaoData = await curacaoResponse.json();
        setCuracaoWeather({
          temperature: curacaoData.current.temperature_2m,
          weatherCode: curacaoData.current.weather_code,
          isDay: curacaoData.current.is_day === 1
        });
      } catch (err) {
        setError('Failed to load weather data');
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Weather code to icon mapping (black and white only)
  const getWeatherIcon = (code: number, isDay: boolean) => {
    const weatherIcons: Record<number, string> = {
      0: isDay ? '☀' : '☾', // Clear sky
      1: isDay ? '☀' : '☾', // Mainly clear
      2: '☁', // Partly cloudy
      3: '☁', // Overcast
      45: '☁', // Fog
      48: '☁', // Depositing rime fog
      51: '☂', // Light drizzle
      53: '☂', // Moderate drizzle
      55: '☂', // Dense drizzle
      56: '☂', // Light freezing drizzle
      57: '☂', // Dense freezing drizzle
      61: '☂', // Slight rain
      63: '☂', // Moderate rain
      65: '☂', // Heavy rain
      66: '☂', // Light freezing rain
      67: '☂', // Heavy freezing rain
      71: '❄', // Slight snow fall
      73: '❄', // Moderate snow fall
      75: '❄', // Heavy snow fall
      77: '❄', // Snow grains
      80: '☂', // Slight rain showers
      81: '☂', // Moderate rain showers
      82: '☂', // Violent rain showers
      85: '❄', // Slight snow showers
      86: '❄', // Heavy snow showers
      95: '⚡', // Thunderstorm
      96: '⚡', // Thunderstorm with slight hail
      99: '⚡', // Thunderstorm with heavy hail
    };
    
    return weatherIcons[code] || '?';
  };

  if (loading) {
    return (
      <div className="w-full bg-gray-900 py-2 px-4 text-center">
        <span className="text-gray-400">Loading weather...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-gray-900 py-2 px-4 text-center">
        <span className="text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900 py-2 px-4 flex justify-between items-center text-sm">
      <div className="flex items-center space-x-4">
        {localWeather && (
          <div className="flex items-center">
            <span className="mr-2">{getWeatherIcon(localWeather.weatherCode, localWeather.isDay)}</span>
            <span>Local: {localWeather.temperature}°C</span>
          </div>
        )}
        {curacaoWeather && (
          <div className="flex items-center">
            <span className="mr-2">{getWeatherIcon(curacaoWeather.weatherCode, curacaoWeather.isDay)}</span>
            <span>Curacao: {curacaoWeather.temperature}°C</span>
          </div>
        )}
      </div>
      <div className="text-gray-500 text-xs">
        Weather data from Open-Meteo
      </div>
    </div>
  );
}
