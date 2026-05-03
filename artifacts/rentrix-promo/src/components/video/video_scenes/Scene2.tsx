import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-start overflow-hidden bg-bg-light"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 w-[50%] z-0 overflow-hidden">
        <motion.div className="w-full h-full"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/architecture.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          initial={{ scale: 1.2, x: '-10%' }}
          animate={{ scale: 1, x: '0%' }}
          transition={{ duration: 6, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-bg-light" />
      </div>

      <div className="relative z-10 w-[50%] ml-[50%] px-16 flex flex-col justify-center">
        <motion.div className="w-16 h-1 bg-primary mb-8"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{ originX: 0 }}
        />
        
        <motion.p
          className="text-[1.2vw] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-primary)' }}
          initial={{ opacity: 0, x: 30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          Property Management
        </motion.p>
        <motion.h2 
          className="text-[4vw] font-bold text-text-primary leading-tight mb-6"
          initial={{ opacity: 0, x: 30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        >
          Smart<br/>Dashboard
        </motion.h2>
        
        <div className="flex flex-col gap-6">
          {['Real-time property overview', 'Occupancy tracking', 'Revenue analytics'].map((text, i) => (
            <motion.div 
              key={i}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
            >
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-[1.5vw] text-text-secondary">{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
