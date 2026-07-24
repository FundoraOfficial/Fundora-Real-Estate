import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import fundoraLogoImg from '../assets/images/fundora_logo_1784832076498.jpg';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 2800 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Progress counter animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 100);

    // Auto finish timer
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 500); // Wait for exit animation
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onFinish]);

  // Handle subtle 3D tilt on mouse/touch move
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 30; // -15 to 15 deg
    const y = (clientY / innerHeight - 0.5) * -30;
    setMousePos({ x, y });
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          onMouseMove={handleMouseMove}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#030514] text-white overflow-hidden select-none"
          style={{ perspective: 1200 }}
        >
          {/* Ambient 3D Glowing Background Lights */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

          {/* 3D Floating Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/40"
                style={{
                  top: `${15 + (i * 7) % 70}%`,
                  left: `${10 + (i * 13) % 80}%`,
                }}
                animate={{
                  y: [-20, 20, -20],
                  x: [-10, 10, -10],
                  opacity: [0.2, 0.8, 0.2],
                  scale: [0.8, 1.4, 0.8],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          {/* Main 3D Card Container */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotateX: 25, rotateY: -25, translateZ: -200 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotateX: mousePos.y || [0, 8, -8, 0],
              rotateY: mousePos.x || [0, -12, 12, 0],
              translateZ: 0,
            }}
            transition={{
              duration: 2.2,
              repeat: mousePos.x ? 0 : Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] max-w-xs w-full mx-4"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Glossy Reflection Highlight */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* 3D Floating Logo Badge */}
            <motion.div
              style={{ transformStyle: 'preserve-3d', transform: 'translateZ(60px)' }}
              animate={{
                y: [-6, 6, -6],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative p-3 rounded-3xl bg-gradient-to-b from-white/10 to-white/0 border border-white/20 shadow-2xl"
            >
              <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center bg-slate-900/90 border border-white/10 p-2">
                <img
                  src={fundoraLogoImg}
                  alt="Fundora Logo"
                  className="w-full h-full object-contain rounded-xl filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
                />
              </div>

              {/* 3D Shield Badge Icon */}
              <div
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950 font-bold shadow-lg border border-white/40"
                style={{ transform: 'translateZ(30px)' }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
            </motion.div>

            {/* Brand Title with 3D Depth */}
            <motion.div
              style={{ transform: 'translateZ(40px)' }}
              className="mt-6 text-center"
            >
              <h1 className="text-2xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-300 to-teal-400 font-sans drop-shadow-md">
                FUNDORA
              </h1>
              <p className="text-[11px] font-medium tracking-widest text-emerald-300/80 uppercase mt-1">
                Fractional Real Estate
              </p>
            </motion.div>
          </motion.div>

          {/* 3D Progress Loader Bar */}
          <div className="mt-10 w-64 flex flex-col items-center gap-2">
            <div className="w-full h-2 rounded-full bg-white/10 p-0.5 overflow-hidden border border-white/10 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                style={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
            
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                {progress < 40 ? 'Initializing Engine...' : progress < 80 ? 'Connecting Firestore...' : 'Ready'}
              </span>
              <span className="text-emerald-400 font-bold">{Math.min(progress, 100)}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
