import type { AudioSource } from "expo-audio";

import { useUser } from "@/core/store/user";

import {
  AUDIO_SOURCES_BY_LANGUAGE,
  ENGLISH_VOCABULARY_AUDIO,
} from "./audio-sources";
import { VOCABULARY_IMAGE_SOURCES } from "./image-sources";

// Types
export type IVocabulary_Word_List = {
  [key: string]: string[];
};

// Word Lists
export const VOCABULARY_WORD_LIST_BY_LEVEL: IVocabulary_Word_List = {
  LEVEL_1: ["good", "sad", "tired", "hungry", "angry", "sick", "hot", "cold"],
};

// Extract all valid words from all levels automatically
export type AllValidWords =
  (typeof VOCABULARY_WORD_LIST_BY_LEVEL)[keyof typeof VOCABULARY_WORD_LIST_BY_LEVEL][number];

// Audio source type for blending words where keys are from list above.
export type IEnglish_Vocabulary_Audio_Source = Partial<
  Record<
    AllValidWords,
    {
      complete: AudioSource;
      snail_speed_complete: AudioSource;
      contracted?: AudioSource;
      snail_speed_contracted?: AudioSource;
    }
  >
>;

export type INative_Vocabulary_Audio_Source = Partial<
  Record<
    AllValidWords,
    {
      complete: AudioSource;
      contracted?: AudioSource;
    }
  >
>;

export type IVocabulary_Image_Source = Partial<
  Record<AllValidWords, { file: any }>
>;

export const requireCompleteEnglishAudioForWord = (
  word: AllValidWords,
): AudioSource => {
  const audio = ENGLISH_VOCABULARY_AUDIO[word]?.complete;
  if (!audio) {
    throw new Error(`English audio file not found for word: ${word}`);
  }
  return audio;
};

export const requireSnailSpeedCompleteEnglishAudioForWord = (
  word: AllValidWords,
): AudioSource => {
  const audio = ENGLISH_VOCABULARY_AUDIO[word]?.snail_speed_complete;
  if (!audio) {
    throw new Error(`English audio file not found for word: ${word}`);
  }
  return audio;
};

export const requireCompleteNativeAudioForWord = (
  word: AllValidWords,
): AudioSource => {
  // Get current language from store - getState() is performant and doesn't cause re-renders
  const { language } = useUser.getState();

  console.log(
    `Fetching native audio for word: ${word} in language: ${language}`,
  );

  const audioSource =
    AUDIO_SOURCES_BY_LANGUAGE[
      language as keyof typeof AUDIO_SOURCES_BY_LANGUAGE
    ];

  const audio = audioSource[word]?.complete;
  if (!audio) {
    // Fallback to English if native language doesn't have the word
    return requireCompleteEnglishAudioForWord(word);
  }
  return audio;
};

export const requireImageForWord = (word: AllValidWords): any => {
  const image = VOCABULARY_IMAGE_SOURCES[word]?.file;
  if (!image) {
    throw new Error(`Image file not found for word: ${word}`);
  }
  return image; // Safe since we checked
};
