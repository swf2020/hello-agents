import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../../types/game.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { useAudioStore } from '../../stores/audioStore.ts';

interface MenuOption {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  gameState?: GameState;
}

export default function MainMenu() {
  const setGameState = useGameStore((s) => s.setGameState);
  const closeMenu = useGameStore((s) => s.closeMenu);
  const playSfx = useAudioStore((s) => s.playSfx);

  const options: MenuOption[] = [
    {
      id: 'pokemon',
      label: '宝可梦',
      icon: '⚡',
      action: () => setGameState(GameState.POKEMON_SUMMARY),
    },
    {
      id: 'bag',
      label: '背包',
      icon: '🎒',
      action: () => setGameState(GameState.INVENTORY),
    },
    {
      id: 'save',
      label: '存档',
      icon: '💾',
      action: () => {
        playSfx('confirm');
        // save is handled by the player store — this just triggers the visual
      },
    },
    {
      id: 'settings',
      label: '设置',
      icon: '⚙️',
      action: () => setGameState(GameState.SHOP),
    },
    {
      id: 'return',
      label: '返回',
      icon: '↩️',
      action: () => closeMenu(),
    },
  ];

  const handleSelect = (opt: MenuOption) => {
    playSfx('confirm');
    opt.action();
  };

  /* ── close on Escape ── */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playSfx('cancel');
        closeMenu();
      }
    },
    [closeMenu, playSfx],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-40 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* ── Semi-transparent backdrop ── */}
        <div className="absolute inset-0 bg-black/50" onClick={() => closeMenu()} />

        {/* ── Menu panel (slides in from left) ── */}
        <motion.div
          className="relative h-full w-72 bg-white/95 backdrop-blur-md shadow-2xl flex flex-col pt-16"
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        >
          <h2 className="text-xl font-bold text-gray-800 px-6 pb-6 border-b border-gray-200">
            菜单
          </h2>

          <nav className="flex-1 flex flex-col py-4">
            {options.map((opt, i) => (
              <motion.button
                key={opt.id}
                className="flex items-center gap-4 px-6 py-4 text-left text-gray-700
                           hover:bg-blue-50 hover:text-blue-700 transition-colors
                           border-l-4 border-transparent hover:border-blue-500 cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => playSfx('select')}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-xl w-8 text-center">{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </motion.button>
            ))}
          </nav>

          <div className="px-6 py-4 border-t border-gray-200 text-xs text-gray-400">
            方向键/WASD 移动 · ESC 菜单
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
