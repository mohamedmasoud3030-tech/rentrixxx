import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-end overflow-hidden bg-bg-dark"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
    >
      <div className="absolute right-0 w-[60%] h-full z-0 overflow-hidden">
        <motion.div className="w-full h-full opacity-60"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/interior.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          initial={{ scale: 1.1, x: '5%' }}
          animate={{ scale: 1, x: '0%' }}
          transition={{ duration: 6, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-bg-dark/50 to-bg-dark" />
      </div>

      <div className="absolute left-0 w-[50%] h-full z-10 px-20 flex flex-col justify-center">
        <motion.h2 
          className="text-[4.5vw] font-bold text-text-inverse leading-tight mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Seamless<br/>Tenant<br/>Tracking
        </motion.h2>
        
        <div className="grid grid-cols-2 gap-8">
          {[
            { value: '100%', label: 'Contract Compliance' },
            { value: 'Zero', label: 'Payment Delays' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              className="bg-white/5 border border-primary/30 p-6 rounded-2xl backdrop-blur-md"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={phase >= 2 + i ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div className="text-primary text-[2.5vw] font-black">{stat.value}</div>
              <div className="text-text-inverse/80 text-[1.2vw] mt-2">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
