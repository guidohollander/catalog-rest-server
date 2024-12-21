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

const Fireworks = ({ className = '' }: FireworksProps) => {
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (count < 10) {
        const newFirework: Firework = {
          id: Date.now(),
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
        setFireworks((prev) => [...prev, newFirework]);
        setCount((prev) => prev + 1);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [count]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFireworks([]);
      setCount(0);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`}>
      <AnimatePresence>
        {fireworks.map((firework) => (
          <motion.div
            key={firework.id}
            initial={{ scale: 0, x: `${firework.x}%`, y: '100%' }}
            animate={{
              scale: 1,
              y: `${firework.y}%`,
              transition: { duration: 0.5 }
            }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute w-4 h-4"
            style={{ backgroundColor: firework.color, borderRadius: '50%' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Fireworks;
