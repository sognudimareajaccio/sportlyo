import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/9f7c92b2-b7af-453b-aa7f-25425becca07/images/99f7fe87d5c1c35396c9c2f8b0e1b24d2d3dec6c12be75aeab1e17843c7cbcea.png";

const AnimatedBackground = ({ children }) => {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="min-h-screen bg-[#050a14] text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/60 via-[#050a14]/30 to-[#050a14]" />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,69,0,0.12) 0%, transparent 70%)',
            left: `${mousePos.x * 100 - 20}%`,
            top: `${mousePos.y * 100 - 20}%`,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 100 }}
        />
      </div>

      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground;
