import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-bg-light"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <svg viewBox="0 0 100 100" className="w-[150%] h-[150%]" preserveAspectRatio="none">
          <motion.path 
            d="M0,50 Q25,20 50,50 T100,50" 
            fill="none" 
            stroke="#B8860B" 
            strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />
          <motion.path 
            d="M0,70 Q25,90 50,70 T100,70" 
            fill="none" 
            stroke="#B8860B" 
            strokeWidth="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
          />
        </svg>
      </div>

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.div
          className="px-6 py-2 rounded-full border-2 border-primary text-primary text-[1.2vw] font-bold uppercase tracking-widest mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
        >
          Financial Intelligence
        </motion.div>

        <motion.h2 
          className="text-[5vw] font-black text-text-primary leading-tight"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          Comprehensive<br/>Finance Reports
        </motion.h2>

        <div className="flex gap-12 mt-16">
          {[
            { h: '60%', delay: 0.2 },
            { h: '80%', delay: 0.3 },
            { h: '40%', delay: 0.4 },
            { h: '90%', delay: 0.5 },
            { h: '100%', delay: 0.6 },
          ].map((bar, i) => (
            <div key={i} className="w-16 h-48 bg-primary/20 rounded-t-xl relative flex items-end">
              <motion.div 
                className="w-full bg-primary rounded-t-xl"
                initial={{ height: '0%' }}
                animate={phase >= 2 ? { height: bar.h } : { height: '0%' }}
                transition={{ duration: 1, delay: bar.delay, ease: 'easeOut' }}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
