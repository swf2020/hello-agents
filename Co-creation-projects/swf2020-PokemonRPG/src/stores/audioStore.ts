import { create } from 'zustand';
import { audioSystem } from '../systems/audioSystem.ts';
import type { BgmType, SfxType } from '../systems/audioSystem.ts';

/**
 * Audio state store — now wired to the real AudioSystem.
 *
 * Call `init()` once from a user-gesture handler (e.g. clicking "新游戏").
 */
interface AudioStore {
  /** Volume for background music (0–1). */
  bgmVolume: number;
  /** Volume for sound effects (0–1). */
  sfxVolume: number;
  /** Master mute toggle. */
  isMuted: boolean;
  /** Name of the currently playing BGM track, or null. */
  currentBgm: BgmType | null;

  /** Initialise the Web Audio context (must be called on user interaction). */
  init: () => void;

  /** Play (or switch) background music by track name. */
  playBgm: (track: BgmType) => void;

  /** Stop background music. */
  stopBgm: () => void;

  /** Queue a sound effect. */
  playSfx: (type: SfxType) => void;

  /** Set BGM volume (clamped 0–1). */
  setBgmVolume: (volume: number) => void;

  /** Set SFX volume (clamped 0–1). */
  setSfxVolume: (volume: number) => void;

  /** Toggle master mute. */
  toggleMute: () => void;
}

export const useAudioStore = create<AudioStore>()((set, get) => ({
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  isMuted: false,
  currentBgm: null,

  init: () => {
    audioSystem.init();
  },

  playBgm: (track) => {
    audioSystem.playBgm(track);
    set({ currentBgm: track });
  },

  stopBgm: () => {
    audioSystem.stopBgm();
    set({ currentBgm: null });
  },

  playSfx: (type) => {
    audioSystem.playSfx(type);
  },

  setBgmVolume: (volume) => {
    const v = Math.max(0, Math.min(1, volume));
    audioSystem.setBgmVolume(v);
    set({ bgmVolume: v });
  },

  setSfxVolume: (volume) => {
    const v = Math.max(0, Math.min(1, volume));
    audioSystem.setSfxVolume(v);
    set({ sfxVolume: v });
  },

  toggleMute: () => {
    const { isMuted } = get();
    const next = !isMuted;
    audioSystem.setMuted(next);
    set({ isMuted: next });
  },
}));
