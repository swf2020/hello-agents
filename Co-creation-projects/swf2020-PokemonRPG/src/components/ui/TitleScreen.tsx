import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';
import { useAudioStore } from '../../stores/audioStore.ts';
import { SAVE_KEY } from '../../data/constants.ts';

/* ─── star data helper ─── */
interface Star {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 2 + 1.5,
  }));
}

/* ─── component ─── */

export default function TitleScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const loadPlayerStore = usePlayerStore((s) => s.load);
  const reset = usePlayerStore((s) => s.reset);
  const audioInit = useAudioStore((s) => s.init);
  const playSfx = useAudioStore((s) => s.playSfx);
  const playBgm = useAudioStore((s) => s.playBgm);

  const hasSave = useMemo(() => {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  const stars = useMemo(() => generateStars(60), []);

  // Start title BGM on mount
  useEffect(() => {
    playBgm('title');
    return () => { /* BGM will be replaced by next screen */ };
  }, [playBgm]);

  const handleNewGame = () => {
    audioInit();
    playSfx('confirm');
    reset();
    startNewGame();
  };

  const handleContinue = () => {
    audioInit();
    playSfx('confirm');
    if (loadPlayerStore()) {
      loadGame();
    }
  };

  const handleHover = () => {
    playSfx('select');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0f0f23] flex flex-col items-center justify-center">
      {/* ── Animated stars background ── */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
            }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* ── Poké Ball icon (CSS art) ── */}
      <motion.div
        className="relative mb-8"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 }}
      >
        <div className="relative h-24 w-24 rounded-full overflow-hidden border-[3px] border-[#222]">
          {/* Top half (red) */}
          <div className="absolute inset-0 bg-[#EE1515]" style={{ clipPath: 'inset(0 0 50% 0)' }} />
          {/* Bottom half (white) */}
          <div className="absolute inset-0 bg-white" style={{ clipPath: 'inset(50% 0 0 0)' }} />
          {/* Center line */}
          <div className="absolute inset-x-0 top-1/2 h-[6px] bg-[#222] -translate-y-1/2 z-10" />
          {/* Center button */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="h-7 w-7 rounded-full bg-white border-[4px] border-[#222]" />
          </div>
        </div>
      </motion.div>

      {/* ── Title text ── */}
      <motion.h1
        className="text-5xl font-bold tracking-wider text-yellow-300 drop-shadow-[0_4px_0_#b45309] mb-2"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 14, delay: 0.4 }}
      >
        宝可梦RPG
      </motion.h1>

      <motion.p
        className="text-gray-400 text-sm mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        究极冒险之旅
      </motion.p>

      {/* ── Buttons ── */}
      <motion.div
        className="flex flex-col gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        <motion.button
          className="px-10 py-3 rounded-lg bg-yellow-400 text-gray-900 font-bold text-lg shadow-lg
                     hover:bg-yellow-300 active:scale-95 transition-transform cursor-pointer"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          onClick={handleNewGame}
          onMouseEnter={handleHover}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          新游戏
        </motion.button>

        {hasSave && (
          <motion.button
            className="px-10 py-3 rounded-lg bg-white/10 text-white font-bold text-lg
                       border border-white/20 hover:bg-white/20 active:scale-95 transition-transform cursor-pointer"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            onClick={handleContinue}
            onMouseEnter={handleHover}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            继续游戏
          </motion.button>
        )}
      </motion.div>

      {/* ── Footer ── */}
      <motion.p
        className="absolute bottom-6 text-gray-600 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        HELLO-AGENTS × 宝可梦RPG
      </motion.p>
    </div>
  );
}
