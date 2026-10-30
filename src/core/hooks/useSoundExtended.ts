import type { AudioPlayer, AudioSource } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { useCallback, useRef } from "react";

import { audioStoreActions, releasePlayer } from "@/core/store/audio";

const useSound = () => {
  const soundRef = useRef<AudioPlayer | null>(null);
  const isPlayingRef = useRef(false);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        releasePlayer(soundRef.current);
        soundRef.current = null;
        isPlayingRef.current = false;
        audioStoreActions.clearCurrentSound();
      } catch (error) {
        console.log("Error stopping sound:", error);
      }
    }
  }, []);

  const pauseSound = useCallback(async () => {
    if (soundRef.current && isPlayingRef.current) {
      try {
        soundRef.current.pause();
        isPlayingRef.current = false;
      } catch (error) {
        console.log("Error pausing sound:", error);
      }
    }
  }, []);

  const resumeSound = useCallback(async () => {
    if (soundRef.current && !isPlayingRef.current) {
      try {
        soundRef.current.play();
        isPlayingRef.current = true;
      } catch (error) {
        console.log("Error resuming sound:", error);
      }
    }
  }, []);

  const playSound = useCallback(
    async (soundSource: AudioSource | string) => {
      try {
        // Stop any currently playing audio globally
        await audioStoreActions.stopAllAudio();

        // Stop any currently playing sound from this hook
        await stopSound();

        // Handle string paths (for require() imports)
        let source = soundSource;
        if (typeof soundSource === "string" && soundSource.includes("mp3")) {
          source = { uri: soundSource };
        }

        // Create and play new sound
        const soundResponse = createAudioPlayer(source);
        soundResponse.play();

        if (soundResponse) {
          soundRef.current = soundResponse;
          isPlayingRef.current = true;

          // Set up status update listener
          soundResponse.addListener("playbackStatusUpdate", (status) => {
            if (status.isLoaded && status.didJustFinish) {
              isPlayingRef.current = false;
              audioStoreActions.clearCurrentSound();
              // Unload sound when finished? Or let cleanup handle it?
              // releasePlayer(soundResponse); // Optional: aggressive cleanup
            }
          });

          // Register with global audio store
          await audioStoreActions.registerSound(soundResponse);
        }
        return soundResponse;
      } catch (error) {
        console.log("Error in playSound:", error);
        throw error;
      }
    },
    [stopSound],
  );

  // Cleanup function to stop and unload sound
  const cleanup = useCallback(async () => {
    // First try the normal way
    if (soundRef.current) {
      try {
        releasePlayer(soundRef.current);

        // Force release the reference
        soundRef.current = null;
        isPlayingRef.current = false;
      } catch (error) {
        console.log("Error in cleanup:", error);

        // Even if there's an error, force cleanup
        soundRef.current = null;
        isPlayingRef.current = false;
      }
    }
  }, []);

  return {
    playSound,
    stopSound,
    pauseSound,
    resumeSound,
    cleanup,
    get isPlaying() {
      return isPlayingRef.current;
    },
    get currentSound() {
      return soundRef.current;
    },
  };
};

export default useSound;
