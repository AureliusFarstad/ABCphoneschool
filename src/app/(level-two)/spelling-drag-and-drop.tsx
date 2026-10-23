import type { RefObject } from "react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ViewInstance } from "react-native";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ALPHABET_AUDIO_SOURCES } from "@/assets/alphabet/alphabet_sounds";
import {
  requireEnglishAudioForWord,
  THREE_LETTER_BLENDING_WORD_LIST_BY_LEVEL,
} from "@/assets/blending";
import { APP_COLORS, SECTION_COLORS } from "@/constants/routes";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import type {
  DestinationComponentType,
  GameSet,
} from "@/ui/components/audio-multiple-choice-component";
import SpellingMultipleChoice from "@/ui/components/spelling-multiple-choice-component";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { useLetterCase } from "@/ui/core/headers/letter-case-context";
import { AnimatedAudioButton } from "@/ui/icons/animated-audio-button-wrapper";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EarButton } from "@/ui/icons/circular/ear-button";
import { globalStyles } from "@/ui/styles";

import { sectionColor } from "./_layout";

const screenHeight = Dimensions.get("window").height;
const SMALL_SCREEN_THRESHOLD = 750; // Consistent threshold
const IS_SMALL_SCREEN = screenHeight < SMALL_SCREEN_THRESHOLD;

const DESTINATION_BUTTON_SIZE = IS_SMALL_SCREEN ? 60 : 80;
const DESTINATION_LETTER_FONT_SIZE = IS_SMALL_SCREEN ? 40 : 55;
const DESTINATION_LETTER_LINE_HEIGHT = IS_SMALL_SCREEN ? 45 : 62;

// Define SOURCE_WORDS outside or ensure it's stable if defined inside.
const SOURCE_WORDS = THREE_LETTER_BLENDING_WORD_LIST_BY_LEVEL.LEVEL_1;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "column",
    alignContent: "center",
    justifyContent: "center",
    margin: 20,
    marginBottom: 32,
    padding: IS_SMALL_SCREEN ? 16 : 24,
    gap: IS_SMALL_SCREEN ? 16 : 24,
    height: IS_SMALL_SCREEN ? 160 : 200,
    backgroundColor: APP_COLORS.offwhite,
    borderColor: sectionColor.primary,
    borderWidth: 2,
    borderRadius: 12,
  },
  cardActive: {
    backgroundColor: sectionColor.light,
  },
  earButtonWrapper: {
    width: IS_SMALL_SCREEN ? 100 : 120,
    height: IS_SMALL_SCREEN ? 100 : 120,
    alignSelf: "center",
  },
  buttonRow: {
    flexDirection: "row",
    alignSelf: "center",
  },
  smallbuttonWrapper: {},
  smallEarButton: {
    width: DESTINATION_BUTTON_SIZE,
    height: DESTINATION_BUTTON_SIZE,
    borderColor: "#D4D4D8",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: DESTINATION_BUTTON_SIZE / 2,
  },
  dropSmallEarButton: {
    width: DESTINATION_BUTTON_SIZE,
    height: DESTINATION_BUTTON_SIZE,
    borderColor: sectionColor.primary,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: DESTINATION_BUTTON_SIZE / 2,
  },
  letterCircle: {
    width: DESTINATION_BUTTON_SIZE,
    height: DESTINATION_BUTTON_SIZE,
    borderRadius: DESTINATION_BUTTON_SIZE / 2,
    backgroundColor: APP_COLORS.green,
    alignContent: "center",
    justifyContent: "center",
  },
  letterStyle: {
    fontFamily: "Thomas",
    fontSize: DESTINATION_LETTER_FONT_SIZE,
    lineHeight: DESTINATION_LETTER_LINE_HEIGHT,
    textAlign: "center",
    color: APP_COLORS.offblack,
  },
});

interface DestinationCardFactoryProps {
  word: string;
  index: number;
}

type DestinationFunction<T> = (
  props: T,
) => (
  isCardActive: boolean,
) => [
  DestinationComponentType,
  RefObject<ViewInstance | null>,
  RefObject<ViewInstance | null>,
];

const buttonColorProps: ButtonColorProps = {
  primaryColor: SECTION_COLORS.blending.primary,
  secondaryColor: SECTION_COLORS.blending.light,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const smallButtonColorProps: ButtonColorProps = {
  primaryColor: APP_COLORS.backgroundgrey,
  secondaryColor: APP_COLORS.backgroundgrey,
  offwhiteColor: APP_COLORS.backgroundgrey,
  offblackColor: "#D4D4D8",
  backgroundColor: APP_COLORS.backgroundgrey,
};

const activeSmallButtonColorProps: ButtonColorProps = {
  primaryColor: sectionColor.light,
  secondaryColor: APP_COLORS.backgroundgrey,
  offwhiteColor: APP_COLORS.backgroundgrey,
  offblackColor: sectionColor.primary,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const Screen = () => {
  // Create persistent refs for each button and the container
  const firstButtonRef = useRef<ViewInstance>(null);
  const secondButtonRef = useRef<ViewInstance>(null);
  const thirdButtonRef = useRef<ViewInstance>(null);
  const destinationContainerRef = useRef<ViewInstance>(null);

  const shuffle = useCallback((array: string[]) => {
    // Return a new shuffled array
    return [...array].sort(() => Math.random() - 0.5);
  }, []);

  const [wordQueue, setWordQueue] = useState<string[]>(() =>
    shuffle(SOURCE_WORDS),
  );
  const [currentWord, setCurrentWord] = useState<string>(
    () => wordQueue[0] || "",
  );
  const [letterIndex, setLetterIndex] = useState(0);

  useEffect(() => {
    // This effect ensures currentWord is updated if wordQueue changes and was empty then populated.
    // Or if the first word of the queue changes for any other reason.
    if (wordQueue.length > 0 && currentWord !== wordQueue[0]) {
      setCurrentWord(wordQueue[0]);
      setLetterIndex(0); // Reset letter index for the new word
    } else if (wordQueue.length === 0 && currentWord !== "") {
      // Handle case where queue becomes empty (e.g. if SOURCE_WORDS was empty)
      setCurrentWord("");
      setLetterIndex(0);
    }
  }, [wordQueue, currentWord]);

  const maxIndex = 3; // Assuming all words are 3 letters long based on THREE_LETTER_...

  const onCorrectAnswer = useCallback(() => {
    setLetterIndex((prevLetterIndex) => {
      if (prevLetterIndex + 1 >= maxIndex) {
        // Word completed
        setWordQueue((prevQueue) => {
          let newQueue = prevQueue.slice(1);
          if (newQueue.length === 0) {
            newQueue = shuffle(SOURCE_WORDS);
          }
          // The useEffect above will handle setting currentWord from newQueue[0]
          return newQueue;
        });
        return 0; // Reset letterIndex for the new word
      } else {
        // Advance letter in current word
        return prevLetterIndex + 1;
      }
    });
  }, [maxIndex, shuffle]); // SOURCE_WORDS is stable, shuffle is memoized

  // Keep the original structure but use useCallback for stability
  const createSpellingDestinationComponent = useCallback<
    DestinationFunction<DestinationCardFactoryProps>
  >(({ word: propWord, index }: DestinationCardFactoryProps) => {
    // This returns a function that matches the original signature expected by AudioMultipleChoice
    return (
      isCardActive: boolean,
    ): [
      DestinationComponentType,
      RefObject<ViewInstance | null>,
      RefObject<ViewInstance | null>,
    ] => {
      const DestinationCard = () => {
        const { isLowercase } = useLetterCase();
        return (
          <View
            style={[styles.card, isCardActive && styles.cardActive]}
            ref={destinationContainerRef}
          >
            <View style={styles.earButtonWrapper}>
              <AnimatedAudioButton
                audioSource={requireEnglishAudioForWord(propWord)}
                width={IS_SMALL_SCREEN ? 100 : 120}
                height={IS_SMALL_SCREEN ? 100 : 120}
              >
                <EarButton {...buttonColorProps} />
              </AnimatedAudioButton>
            </View>
            <View style={styles.buttonRow}>
              {/* FIRST BUTTON - Always use firstButtonRef */}
              <View
                style={[
                  index === 0 && styles.dropSmallEarButton,
                  index > 0 && styles.smallbuttonWrapper,
                ]}
                ref={firstButtonRef}
              >
                <AnimatedAudioButton
                  audioSource={
                    ALPHABET_AUDIO_SOURCES[(propWord as string)[0]]?.sound
                  }
                  width={DESTINATION_BUTTON_SIZE}
                  height={DESTINATION_BUTTON_SIZE}
                >
                  {index > 0 ? (
                    <View style={styles.letterCircle}>
                      <Text style={styles.letterStyle}>
                        {isLowercase
                          ? (propWord as string)[0].toLowerCase()
                          : (propWord as string)[0].toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <EarButton
                      {...(index === 0
                        ? activeSmallButtonColorProps
                        : smallButtonColorProps)}
                    />
                  )}
                </AnimatedAudioButton>
              </View>
              {/* SECOND BUTTON - Always use secondButtonRef */}
              <View
                style={[
                  index === 1 && styles.dropSmallEarButton,
                  index < 1 && styles.smallEarButton,
                  index > 1 && styles.smallbuttonWrapper,
                ]}
                ref={secondButtonRef}
              >
                <AnimatedAudioButton
                  audioSource={
                    ALPHABET_AUDIO_SOURCES[(propWord as string)[1]]?.sound
                  }
                  width={DESTINATION_BUTTON_SIZE}
                  height={DESTINATION_BUTTON_SIZE}
                >
                  {index > 1 ? (
                    <View style={styles.letterCircle}>
                      <Text style={styles.letterStyle}>
                        {isLowercase
                          ? (propWord as string)[1].toLowerCase()
                          : (propWord as string)[1].toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <EarButton
                      {...(index === 1
                        ? activeSmallButtonColorProps
                        : smallButtonColorProps)}
                    />
                  )}
                </AnimatedAudioButton>
              </View>
              {/* THIRD BUTTON - Always use thirdButtonRef */}
              <View
                style={[
                  index === 2 && styles.dropSmallEarButton,
                  index < 2 && styles.smallEarButton,
                  index > 2 && styles.smallbuttonWrapper,
                ]}
                ref={thirdButtonRef}
              >
                <AnimatedAudioButton
                  audioSource={
                    ALPHABET_AUDIO_SOURCES[(propWord as string)[2]]?.sound
                  }
                  width={DESTINATION_BUTTON_SIZE}
                  height={DESTINATION_BUTTON_SIZE}
                >
                  {index > 2 ? (
                    <View style={styles.letterCircle}>
                      <Text style={styles.letterStyle}>
                        {isLowercase
                          ? (propWord as string)[2].toLowerCase()
                          : (propWord as string)[2].toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <EarButton
                      {...(index === 2
                        ? activeSmallButtonColorProps
                        : smallButtonColorProps)}
                    />
                  )}
                </AnimatedAudioButton>
              </View>
            </View>
          </View>
        );
      };

      // Select the appropriate ref to return based on the current index
      let activeDropRef: RefObject<ViewInstance | null>;
      if (index === 0) {
        activeDropRef = firstButtonRef;
      } else if (index === 1) {
        activeDropRef = secondButtonRef;
      } else {
        activeDropRef = thirdButtonRef;
      }

      return [DestinationCard, activeDropRef, destinationContainerRef];
    };
  }, []);

  // Helper function to render the appropriate content based on dialogueCounter
  // Use useMemo to only recalculate when dependencies change
  const spellingContent = useMemo(() => {
    if (!currentWord) {
      // Handle cases where currentWord might be temporarily empty
      return null; // Or some loading/empty state
    }
    // Create destination component with current word and letter index
    const DestinationComponent = createSpellingDestinationComponent({
      word: currentWord,
      index: letterIndex,
    });

    // Get the current letter that should be the correct answer
    const currentLetter = currentWord[letterIndex];

    const gameSet: GameSet = {
      correctAnswerId: currentLetter,
      options: [
        { id: "p", audioFile: ALPHABET_AUDIO_SOURCES.p.sound },
        { id: "a", audioFile: ALPHABET_AUDIO_SOURCES.a.sound },
        { id: "n", audioFile: ALPHABET_AUDIO_SOURCES.n.sound },
        { id: "i", audioFile: ALPHABET_AUDIO_SOURCES.i.sound },
        { id: "t", audioFile: ALPHABET_AUDIO_SOURCES.t.sound },
      ],
    };

    // Create a unique key combining word and letter index
    const componentKey = `${currentWord}-${letterIndex}`;

    return (
      <SpellingMultipleChoice
        key={componentKey} // Add this key prop
        useDestinationComponent={DestinationComponent}
        gameSet={gameSet}
        onCorrectAnswer={onCorrectAnswer}
        sectionColorTheme={sectionColor}
      />
    );
  }, [
    currentWord,
    letterIndex,
    onCorrectAnswer,
    createSpellingDestinationComponent,
  ]);

  const {
    playGuideAudio,
    stopGuideAudio,
    isPlaying: isPlayingGuidanceAudio,
  } = useGuideAudio({
    screenName: "spelling-tab",
    module: "blending-module",
  });

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "right", "left"]}
    >
      <GuidanceAudioHeader
        title="Spelling Game"
        isPlaying={isPlayingGuidanceAudio}
        onPressGuide={playGuideAudio}
        onStopGuide={stopGuideAudio}
        showLetterCaseSwitch={true}
      />
      {spellingContent}
    </SafeAreaView>
  );
};

export default Screen;
