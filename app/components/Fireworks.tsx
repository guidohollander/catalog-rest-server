'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const colors = [
  '#FFD700', // Gold
  '#FF69B4', // Hot Pink
  '#00FF00', // Lime
  '#FF4500', // Orange Red
  '#1E90FF', // Dodger Blue
  '#FF1493', // Deep Pink
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#FFFF00', // Yellow
  '#00FF7F', // Spring Green
];

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  particles: number;
}

export function Fireworks() {
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show fireworks after 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
      startFireworks();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const startFireworks = () => {
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 25) { // Increased number of fireworks
        clearInterval(interval);
        setTimeout(() => startFireworks(), 2000); // Restart after 2 seconds
        return;
      }

      const newFirework: Firework = {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 60 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 2 + 1, // Random size
        particles: Math.floor(Math.random() * 4) + 8 // Random number of particles
      };

      setFireworks(prev => [...prev, newFirework]);
      count++;

      // Remove firework after animation
      setTimeout(() => {
        setFireworks(prev => prev.filter(f => f.id !== newFirework.id));
      }, 1500);
    }, 200); // Faster launch interval

    return () => clearInterval(interval);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none">
      <AnimatePresence>
        {fireworks.map(firework => (
          <motion.div
            key={firework.id}
            initial={{ scale: 0, x: `${firework.x}%`, y: '100%' }}
            animate={{
              scale: [0, 1, 1, 0],
              y: `${firework.y}%`,
              opacity: [1, 1, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute"
          >
            <div className="relative">
              {/* Trail effect */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: [0, 100, 0] }}
                transition={{ duration: 0.5 }}
                style={{
                  position: 'absolute',
                  width: '2px',
                  bottom: 0,
                  left: '50%',
                  background: `linear-gradient(to top, transparent, ${firework.color})`,
                  transformOrigin: 'bottom'
                }}
              />
              
              {/* Explosion particles */}
              {[...Array(firework.particles)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    x: Math.cos(i * (2 * Math.PI / firework.particles)) * 100,
                    y: Math.sin(i * (2 * Math.PI / firework.particles)) * 100,
                    opacity: [1, 0],
                    scale: [1, 0]
                  }}
                  transition={{ 
                    duration: 1,
                    ease: "easeOut",
                    times: [0, 1]
                  }}
                  className="absolute"
                  style={{
                    width: `${firework.size * 4}px`,
                    height: `${firework.size * 4}px`,
                    borderRadius: '50%',
                    backgroundColor: firework.color,
                    boxShadow: `0 0 ${firework.size * 8}px ${firework.color}`
                  }}
                />
              ))}
              
              {/* Secondary particles */}
              {[...Array(firework.particles * 2)].map((_, i) => (
                <motion.div
                  key={`spark-${i}`}
                  animate={{
                    x: (Math.random() - 0.5) * 160,
                    y: (Math.random() - 0.5) * 160,
                    opacity: [1, 0],
                    scale: [1, 0]
                  }}
                  transition={{ 
                    duration: Math.random() * 0.5 + 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute"
                  style={{
                    width: `${firework.size}px`,
                    height: `${firework.size}px`,
                    borderRadius: '50%',
                    backgroundColor: firework.color,
                    boxShadow: `0 0 ${firework.size * 4}px ${firework.color}`
                  }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
