'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const colors = [
  '#FFD700', // Gold
  '#FF69B4', // Hot Pink
  '#FF4500', // Orange Red
  '#1E90FF', // Dodger Blue
  '#FF1493', // Deep Pink
];

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface FireworksProps {
  className?: string;
}

export function Fireworks({ className = '' }: FireworksProps) {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newFirework: Firework = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 60 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
      };

      setFireworks(prev => [...prev, newFirework]);

      // Remove firework after animation
      setTimeout(() => {
        setFireworks(prev => prev.filter(f => f.id !== newFirework.id));
      }, 1000);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`}>
      <AnimatePresence>
        {fireworks.map(firework => (
          <motion.div
            key={firework.id}
            initial={{ scale: 0, x: `${firework.x}%`, y: '100%' }}
            animate={{
              scale: [0, 1, 0],
              y: `${firework.y}%`,
              opacity: [1, 1, 0]
            }}
            transition={{ duration: 1 }}
            className="absolute w-4 h-4 rounded-full"
            style={{ backgroundColor: firework.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
