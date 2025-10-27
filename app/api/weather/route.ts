import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude' },
        { status: 400 }
      );
    }

    // Using OpenWeatherMap API (free tier)
    // You can sign up at https://openweathermap.org/api for a free API key
    const apiKey = process.env.OPENWEATHER_API_KEY || 'demo'; // Use 'demo' for testing
    
    // If no API key is configured, return mock data
    if (apiKey === 'demo') {
      return NextResponse.json({
        temp: Math.round(25 + Math.random() * 10),
        description: 'partly cloudy',
        icon: '02d'
      });
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();

    return NextResponse.json({
      temp: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
