import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-bg-dark z-0" />
      <motion.div className="absolute inset-0 opacity-30 z-0"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/abstract-gold.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        animate={{ scale: [1.1, 1.2], rotate: [0, 2] }}
        transition={{ duration: 6, ease: 'linear' }}
      />
      
      <div className="relative z-10 flex flex-col items-center" style={{ perspective: '1000px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 45 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 30, rotateX: 45 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <img src={`${import.meta.env.BASE_URL}icon-rentrix.png`} alt="Rentrix Logo" className="w-32 h-32 object-contain" />
        </motion.div>
        
        <motion.h1 
          className="text-[6vw] font-black text-text-inverse tracking-wide uppercase leading-none"
          initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
          animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(10px)', y: 20 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          Rentrix
        </motion.h1>
        
        <motion.p
          className="text-[2vw] text-primary mt-6 tracking-[0.2em] uppercase font-semibold"
          initial={{ opacity: 0, letterSpacing: '0em' }}
          animate={phase >= 3 ? { opacity: 1, letterSpacing: '0.2em' } : { opacity: 0, letterSpacing: '0em' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          Luxury Property Management
        </motion.p>
      </div>
    </motion.div>
  );
}
