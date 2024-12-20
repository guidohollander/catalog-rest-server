'use client';

import { useEffect, useState, useCallback } from 'react';
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

interface FireworksProps {
  className?: string;
}

export function Fireworks({ className = '' }: FireworksProps) {
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const startFireworks = useCallback(() => {
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
  }, []);

  useEffect(() => {
    // Show fireworks after 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
      startFireworks();
    }, 2000);

    return () => clearTimeout(timer);
  }, [startFireworks]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`}>
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
                  transformOrigin: 'bottom',
                }}
              />
              {/* Explosion particles */}
              {Array.from({ length: firework.particles }).map((_, i) => {
                const angle = (i * 360) / firework.particles;
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: [0, 1, 0],
                      x: [0, Math.cos(angle * Math.PI / 180) * 50],
                      y: [0, Math.sin(angle * Math.PI / 180) * 50],
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{
                      position: 'absolute',
                      width: `${firework.size}px`,
                      height: `${firework.size}px`,
                      borderRadius: '50%',
                      backgroundColor: firework.color,
                      boxShadow: `0 0 ${firework.size * 2}px ${firework.color}`,
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
