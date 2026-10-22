import type { AudioPlayer } from "expo-audio";
import { create } from "zustand";

import { createSelectors } from "@/core/utils";

interface AudioState {
  currentSound: AudioPlayer | null;
  onCurrentSoundStop: (() => void) | null;
  isPlaying: boolean;
  stopAllAudio: () => Promise<void>;
  registerSound: (sound: AudioPlayer, onStop?: () => void) => Promise<void>;
  clearCurrentSound: () => void;
}

// Stops the player and frees its native resources. Safe to call more than once.
export const releasePlayer = (player: AudioPlayer) => {
  try {
    player.pause();
    player.remove();
  } catch (e) {
    // Ignore error if player is already released
  }
  player.release();
};

const useAudioStoreBase = create<AudioState>()((set, get) => ({
  currentSound: null,
  onCurrentSoundStop: null,
  isPlaying: false,

  stopAllAudio: async () => {
    const { currentSound, onCurrentSoundStop } = get();
    if (currentSound) {
      try {
        releasePlayer(currentSound);
      } catch (error) {
        console.warn("[AudioStore] Error stopping audio:", error);
      }
      set({ currentSound: null, onCurrentSoundStop: null, isPlaying: false });
      // expo-audio emits no status update on release, so tell the owner directly
      onCurrentSoundStop?.();
    }
  },

  registerSound: async (sound: AudioPlayer, onStop?: () => void) => {
    // register the new sound - caller is responsible for stopping previous audio first
    set({
      currentSound: sound,
      onCurrentSoundStop: onStop ?? null,
      isPlaying: true,
    });
  },

  clearCurrentSound: () => {
    set({ currentSound: null, onCurrentSoundStop: null, isPlaying: false });
  },
}));

export const useAudioStore = createSelectors(useAudioStoreBase);

export const audioStoreActions = {
  stopAllAudio: () => useAudioStoreBase.getState().stopAllAudio(),
  registerSound: (sound: AudioPlayer, onStop?: () => void) =>
    useAudioStoreBase.getState().registerSound(sound, onStop),
  clearCurrentSound: () => useAudioStoreBase.getState().clearCurrentSound(),
};
