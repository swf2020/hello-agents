import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameState } from '../../types/game.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { useAudioStore } from '../../stores/audioStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';

export default function SettingsPanel() {
  const setGameState = useGameStore((s) => s.setGameState);
  const reset = usePlayerStore((s) => s.reset);

  const bgmVolume = useAudioStore((s) => s.bgmVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const setBgmVolume = useAudioStore((s) => s.setBgmVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const playSfx = useAudioStore((s) => s.playSfx);
  const stopBgm = useAudioStore((s) => s.stopBgm);

  const save = usePlayerStore((s) => s.save);

  /* ── close ── */
  const goBack = useCallback(() => {
    playSfx('cancel');
    setGameState(GameState.MENU);
  }, [playSfx, setGameState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goBack]);

  const handleSave = () => {
    playSfx('confirm');
    save();
    // brief visual feedback
  };

  const handleReturnToTitle = () => {
    playSfx('confirm');
    stopBgm();
    reset();
    setGameState(GameState.TITLE);
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-gradient-to-br from-blue-50 to-white flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">设置</h2>
        <button
          className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium
                     transition-colors cursor-pointer"
          onClick={goBack}
        >
          返回
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* ── BGM Volume ── */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>🔊 背景音乐音量</span>
              <span className="tabular-nums text-gray-500">{Math.round(bgmVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(bgmVolume * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setBgmVolume(v);
                playSfx('select');
              }}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                         accent-blue-500 [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                         [&::-webkit-slider-thumb]:shadow"
            />
          </div>

          {/* ── SFX Volume ── */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>🎵 音效音量</span>
              <span className="tabular-nums text-gray-500">{Math.round(sfxVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setSfxVolume(v);
                playSfx('select');
              }}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                         accent-blue-500 [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                         [&::-webkit-slider-thumb]:shadow"
            />
          </div>

          {/* ── Mute ── */}
          <div className="flex items-center gap-3">
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer
                          ${isMuted ? 'bg-gray-300' : 'bg-blue-500'}`}
              onClick={() => {
                toggleMute();
                playSfx('select');
              }}
              role="switch"
              aria-checked={!isMuted}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                            ${isMuted ? 'translate-x-1' : 'translate-x-6'}`}
              />
            </button>
            <span className="text-sm text-gray-700">{isMuted ? '已静音' : '静音'}</span>
          </div>

          <hr className="border-gray-200" />

          {/* ── Save ── */}
          <button
            className="w-full py-3 rounded-xl bg-green-500 text-white font-bold
                       hover:bg-green-600 active:scale-95 transition-all cursor-pointer shadow-sm"
            onClick={handleSave}
          >
            💾 保存游戏
          </button>

          {/* ── Return to title ── */}
          <button
            className="w-full py-3 rounded-xl bg-red-500 text-white font-bold
                       hover:bg-red-600 active:scale-95 transition-all cursor-pointer shadow-sm"
            onClick={handleReturnToTitle}
          >
            🏠 回到标题画面
          </button>
        </div>
      </div>
    </motion.div>
  );
}
