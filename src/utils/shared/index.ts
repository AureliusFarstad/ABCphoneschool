import type { AudioSource } from "expo-audio";

import { GUIDANCE_AUDIO_SOURCES_BY_LANGUAGE } from "@/assets/guidance-audio/audio-sources";
import { useUser } from "@/core/store/user";
import type { CombinedRoutes } from "@/types/navigation-types";

type AudioFile = AudioSource;

export const getGuides = async (
  screenName: CombinedRoutes,
  module: keyof GuidanceType = "alphabet-module",
): Promise<AudioFile[]> => {
  const { language } = useUser.getState();

  let guidance =
    GUIDANCE_AUDIO_SOURCES_BY_LANGUAGE[
      language as keyof typeof GUIDANCE_AUDIO_SOURCES_BY_LANGUAGE
    ];

  try {
    if (guidance[module] && screenName in guidance[module]) {
      const audioFiles =
        guidance[module][screenName as keyof GuidanceMOdule]["audio-files"];
      return Array.isArray(audioFiles) ? audioFiles : [audioFiles];
    }
    throw new Error(`Screen name ${screenName} not found in guidance`);
  } catch (error) {
    console.log("error in getGuides", error);
    throw error;
  }
};
