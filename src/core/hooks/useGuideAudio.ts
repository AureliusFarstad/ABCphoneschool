import type { AudioPlayer, AudioSource, AudioStatus } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";

import { audioStoreActions, releasePlayer } from "@/core/store/audio";
import type { CombinedRoutes } from "@/types/navigation-types";
import { getGuides } from "@/utils/shared";

type GuideAudioProps = {
  screenName: CombinedRoutes;
  module?: keyof GuidanceType;
};

export const useGuideAudio = ({ screenName, module }: GuideAudioProps) => {
  const soundRef = useRef<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  // Keep screen awake while guidance audio is playing
  useEffect(() => {
    if (isPlaying) {
      activateKeepAwakeAsync("guidance-audio");
    } else {
      deactivateKeepAwake("guidance-audio");
    }

    return () => {
      deactivateKeepAwake("guidance-audio");
    };
  }, [isPlaying]);

  useEffect(() => {
    isMountedRef.current = true;
    const soundInstanceAtEffectStart = soundRef.current;

    return () => {
      isMountedRef.current = false;
      if (soundInstanceAtEffectStart) {
        try {
          releasePlayer(soundInstanceAtEffectStart);
        } catch (error) {
          console.warn(
            `[useGuideAudio] Cleanup: Error stopping/unloading sound for ${screenName}:`,
            (error as Error).message,
          );
        }
        if (soundRef.current === soundInstanceAtEffectStart) {
          soundRef.current = null;
        }
      }
    };
  }, [screenName]);

  const playSequentialSounds = useCallback(
    async (playbackSources: AudioSource[]) => {
      if (!isMountedRef.current) {
        return;
      }

      if (soundRef.current) {
        try {
          releasePlayer(soundRef.current);
        } catch (e) {
          console.warn(
            "[useGuideAudio] playSequentialSounds: Error unloading existing soundRef.current",
            e,
          );
        }
        soundRef.current = null;
      }

      let currentSoundIndex = 0;
      const playNextSound = async () => {
        if (!isMountedRef.current) {
          if (soundRef.current) releasePlayer(soundRef.current);
          soundRef.current = null;
          if (isMountedRef.current) setIsPlaying(false);
          audioStoreActions.clearCurrentSound();
          return;
        }
        if (currentSoundIndex >= playbackSources.length) {
          if (soundRef.current) releasePlayer(soundRef.current);
          soundRef.current = null;
          if (isMountedRef.current) setIsPlaying(false);
          audioStoreActions.clearCurrentSound();
          return;
        }

        const source = playbackSources[currentSoundIndex];

        try {
          if (soundRef.current) {
            console.warn(
              "[useGuideAudio] playSequentialSounds: soundRef.current was not null before creating new sound. This should not happen if previous unload was successful.",
            );
            releasePlayer(soundRef.current);
            soundRef.current = null;
          }

          const newSound = createAudioPlayer(source);
          newSound.play();
          soundRef.current = newSound;

          const subscription = newSound.addListener(
            "playbackStatusUpdate",
            (status: AudioStatus) => {
              if (!isMountedRef.current && newSound === soundRef.current) {
                if (soundRef.current) {
                  try {
                    releasePlayer(soundRef.current);
                  } catch (e) {
                    console.warn(
                      "Error unloading sound on status update after unmount",
                      e,
                    );
                  }
                  soundRef.current = null;
                }
                return;
              }

              if (!status.isLoaded) {
                return;
              }
              if (status.didJustFinish) {
                subscription.remove();
                currentSoundIndex++;
                playNextSound();
              }
            },
          );

          // Register with global audio store
          await audioStoreActions.registerSound(newSound);
        } catch (error) {
          console.error(
            "[useGuideAudio] playSequentialSounds: Error creating or playing sound:",
            error,
          );
          if (soundRef.current) {
            try {
              releasePlayer(soundRef.current);
            } catch (e) {
              console.warn(
                "Error unloading sound in playSequentialSounds catch",
                e,
              );
            }
            soundRef.current = null;
          }
          if (isMountedRef.current) setIsPlaying(false);
          audioStoreActions.clearCurrentSound();
        }
      };

      playNextSound();
    },
    [],
  );

  const stopGuideAudio = useCallback(async () => {
    const soundToStop = soundRef.current;

    if (soundToStop) {
      try {
        releasePlayer(soundToStop);
      } catch (error) {
        console.error(
          "[useGuideAudio] stopGuideAudio: Error stopping/unloading sound:",
          error,
        );
      } finally {
        if (soundRef.current === soundToStop) {
          soundRef.current = null;
        }
      }
    }

    if (isMountedRef.current) {
      setIsPlaying(false);
    }
    audioStoreActions.clearCurrentSound();
  }, []);

  const playGuideAudio = useCallback(async () => {
    if (isPlaying && soundRef.current) {
      await stopGuideAudio();
    }

    if (!isMountedRef.current) {
      return;
    }

    // Stop any other audio playing globally before starting guidance
    await audioStoreActions.stopAllAudio();

    setIsPlaying(true);

    try {
      const playbackSources = await getGuides(screenName, module);
      if (!isMountedRef.current) {
        setIsPlaying(false);
        return;
      }

      if (playbackSources.length === 0) {
        if (isMountedRef.current) setIsPlaying(false);
        return;
      }
      await playSequentialSounds(playbackSources);
    } catch (error) {
      console.error("[useGuideAudio] playGuideAudio: Error in process:", error);
      if (soundRef.current) {
        try {
          releasePlayer(soundRef.current);
        } catch (e) {
          console.warn("Error unloading in playGuideAudio catch", e);
        }
        soundRef.current = null;
      }
      if (isMountedRef.current) setIsPlaying(false);
      audioStoreActions.clearCurrentSound();
    }
  }, [screenName, module, stopGuideAudio, playSequentialSounds, isPlaying]);

  return {
    playGuideAudio,
    stopGuideAudio,
    isPlaying,
  };
};
