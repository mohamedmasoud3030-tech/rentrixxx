import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      <motion.div className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/abstract-gold.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        initial={{ scale: 1, rotate: 0 }}
        animate={{ scale: 1.1, rotate: -2 }}
        transition={{ duration: 6, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/80 to-transparent z-0" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 border border-primary/50"
          initial={{ scale: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.div 
            className="w-12 h-12 bg-primary rounded-full blur-sm"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.h2 
          className="text-[3.5vw] font-bold text-text-inverse text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Powered by Intelligent<br/><span className="text-primary">AI Assistant</span>
        </motion.h2>

        <motion.div
          className="flex items-center gap-6 mt-8 pt-8 border-t border-white/10"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <img src={`${import.meta.env.BASE_URL}icon-rentrix.png`} alt="Rentrix" className="w-16 h-16 object-contain" />
          <span className="text-[2.5vw] font-black tracking-wide text-text-inverse uppercase">Rentrix</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
