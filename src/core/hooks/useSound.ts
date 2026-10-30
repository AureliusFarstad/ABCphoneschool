import type { AudioPlayer, AudioSource } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { useEffect, useState } from "react";

import { audioStoreActions, releasePlayer } from "@/core/store/audio";

const useSound = () => {
  const [sound, setSound] = useState<AudioPlayer>();

  const playSound = async (soundSource: AudioSource | string) => {
    try {
      // Stop any currently playing audio globally
      await audioStoreActions.stopAllAudio();

      if (typeof soundSource === "string" && soundSource.includes("mp3")) {
        soundSource = { uri: soundSource };
      }
      const soundResponse = createAudioPlayer(soundSource);
      if (soundResponse) {
        setSound(soundResponse);
      }
      soundResponse.play();

      if (soundResponse) {
        // Register with global audio store after playing to avoid race condition
        await audioStoreActions.registerSound(soundResponse);
      }
    } catch (error) {
      console.log("error in playSound", error);
      throw error;
    }
  };

  useEffect(() => {
    return sound
      ? () => {
          try {
            releasePlayer(sound);
          } catch (e) {
            // Ignore error if sound is already released
          }
        }
      : undefined;
  }, [sound]);
  return { playSound };
};

export default useSound;
