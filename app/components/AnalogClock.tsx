'use client';

import { useState, useEffect } from 'react';

interface AnalogClockProps {
  timezone: string;
  label: string;
}

export default function AnalogClock({ timezone, label }: AnalogClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get time in specified timezone
  const getTimeInTimezone = () => {
    return new Date(time.toLocaleString('en-US', { timeZone: timezone }));
  };

  const localTime = getTimeInTimezone();
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const seconds = localTime.getSeconds();

  // Calculate angles
  const secondAngle = (seconds * 6) - 90; // 6 degrees per second
  const minuteAngle = (minutes * 6 + seconds * 0.1) - 90; // 6 degrees per minute + smooth movement
  const hourAngle = ((hours % 12) * 30 + minutes * 0.5) - 90; // 30 degrees per hour + smooth movement

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40 rounded-full border-4 border-gray-600 bg-gray-900">
        {/* Clock face markers */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30) - 90;
          const x = 50 + 35 * Math.cos((angle * Math.PI) / 180);
          const y = 50 + 35 * Math.sin((angle * Math.PI) / 180);
          return (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gray-500 rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}

        {/* Center dot */}
        <div className="absolute w-3 h-3 bg-white rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10" />

        {/* Hour hand */}
        <div
          className="absolute top-1/2 left-1/2 origin-left bg-white"
          style={{
            width: '35%',
            height: '4px',
            transform: `rotate(${hourAngle}deg)`,
            marginTop: '-2px',
          }}
        />

        {/* Minute hand */}
        <div
          className="absolute top-1/2 left-1/2 origin-left bg-gray-300"
          style={{
            width: '45%',
            height: '3px',
            transform: `rotate(${minuteAngle}deg)`,
            marginTop: '-1.5px',
          }}
        />

        {/* Second hand */}
        <div
          className="absolute top-1/2 left-1/2 origin-left bg-red-500"
          style={{
            width: '48%',
            height: '2px',
            transform: `rotate(${secondAngle}deg)`,
            marginTop: '-1px',
          }}
        />
      </div>
      <div className="mt-3 text-center">
        <div className="text-sm font-semibold text-gray-300">{label}</div>
        <div className="text-xs text-gray-400 font-mono">
          {localTime.toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </div>
    </div>
  );
}
