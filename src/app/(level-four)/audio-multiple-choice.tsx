import type { AudioPlayer } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ViewInstance } from "react-native";
import { StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Reanimated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  requireCompleteEnglishAudioForWord,
  requireCompleteNativeAudioForWord,
  requireImageForWord,
  VOCABULARY_WORD_LIST_BY_LEVEL,
} from "@/assets/vocabulary";
import { APP_COLORS } from "@/constants/routes";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import { audioStoreActions, releasePlayer } from "@/core/store/audio";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { AnimatedAudioButton } from "@/ui/icons/animated-audio-button-wrapper";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EnglishButton } from "@/ui/icons/circular/english-button";
import { NativeButton } from "@/ui/icons/circular/native-button";
import { globalStyles } from "@/ui/styles";
import { generateMultipleChoiceOptions, shuffleArray } from "@/utils/helpers";
import {
  BOTTOM_TAB_HEIGHT,
  HEADER_HEIGHT,
  HEIGHT,
  IS_SMALL_SCREEN,
  WIDTH,
} from "@/utils/layout";

import { SECTION_COLOR } from "./_layout";

// ------------------------------------------------------------
// TYPE DEFINITIONS
// ------------------------------------------------------------

type ButtonItem = {
  // Used for draggable buttons
  id: string;
  word: string;
};

type Position = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

// COLORS: Maybe move to icons folder were ButtonColorProps is from.

// Button color configurations # TODO: Refactor out colors to constants
const BUTTON_COLORS: ButtonColorProps[] = [
  {
    // Pink
    primaryColor: "#FFABDE",
    offwhiteColor: "#FAFAFA",
    offblackColor: "#3F3F46",
    secondaryColor: "#D282AE",
    backgroundColor: "#FFF0F6",
  },
  {
    // Purple
    primaryColor: "#C385F8",
    offwhiteColor: "#FAFAFA",
    offblackColor: "#3F3F46",
    secondaryColor: "#9A7DE0",
    backgroundColor: "#F5F0FF",
  },
  {
    // Blue
    primaryColor: "#62A0EC",
    offwhiteColor: "#FAFAFA",
    offblackColor: "#3F3F46",
    secondaryColor: "#5BA3E0",
    backgroundColor: "#EFF6FF",
  },
];

// TODO: Move to layout
export const NATIVE_BUTTON_COLOR: ButtonColorProps = {
  primaryColor: SECTION_COLOR.sectionPrimaryColor,
  secondaryColor: SECTION_COLOR.sectionSecondaryColor,
  offwhiteColor: SECTION_COLOR.appWhiteColor,
  offblackColor: SECTION_COLOR.appBlackColor,
  backgroundColor: SECTION_COLOR.appGreyColor,
};

// Feedback color configurations
const CORRECT_COLORS: ButtonColorProps = {
  primaryColor: "#62CC82",
  offwhiteColor: "#FAFAFA",
  offblackColor: "#3F3F46",
  secondaryColor: "#2E8B57",
  backgroundColor: "#E8F5E9",
};

const INCORRECT_COLORS: ButtonColorProps = {
  primaryColor: "#FF5A5F",
  offwhiteColor: "#FAFAFA",
  offblackColor: "#3F3F46",
  secondaryColor: "#D32F2F",
  backgroundColor: "#FFEBEE",
};

const DISABLED_COLORS: ButtonColorProps = {
  primaryColor: "#F2EFF0",
  offwhiteColor: "#FAFAFA",
  offblackColor: "#D4D4D8",
  secondaryColor: "#888888",
  backgroundColor: "#F5F5F5",
};

// Props for the DraggableButton component
interface DraggableButtonProps {
  item: ButtonItem;
  disabled?: boolean;
  isLockedByGame?: boolean;
  onAudioPlay: () => void;
  onDragStart: () => void;
  onDragEnd: (position: Position, isInTarget: boolean) => void;
  buttonColor: ButtonColorProps;
  targetPosition: Position | null;
  isPlaced?: boolean;
  isCorrect?: boolean | null;
  isPlaying?: boolean;
  onMarkDisabled?: (buttonId: string) => void;
  breatheDuration?: number;
  animationBorderColor?: string;
  animationBorderWidth?: number;
}

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

type GameSet = {
  correctAnswer: string;
  options: string[];
};

// Layout and animation constants
const BUTTON_SIZE: number = 80;
const FLASHCARD_HEIGHT: number = 350;
const DRAG_DELAY_MS: number = 100;
const INCORRECT_FEEDBACK_DURATION_MS: number = 2000;
const SPRING_CONFIG: { damping: number; stiffness: number } = {
  damping: 15,
  stiffness: 100,
};

// ------------------------------------------------------------
// STYLES
// ------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundColor: APP_COLORS.backgroundgrey,
  },
  flashcardContainer: {
    flex: 1,
    justifyContent: "center", // Center the flashcard vertically
  },
  flashcard: {
    height: IS_SMALL_SCREEN ? FLASHCARD_HEIGHT - 40 : FLASHCARD_HEIGHT,
    borderWidth: 2,
    borderColor: SECTION_COLOR.sectionPrimaryColor,
    borderRadius: 12,
    backgroundColor: APP_COLORS.offwhite,
    marginHorizontal: 16,
    padding: 16,
    flexDirection: "column",
  },
  flashcardActive: {
    borderWidth: 2,
    borderColor: SECTION_COLOR.sectionPrimaryColor,
    borderStyle: "dashed",
    backgroundColor: "#FAE7D6",
  },
  imageContainer: {
    width: "100%",
    height: IS_SMALL_SCREEN ? 160 : 200,
    backgroundColor: APP_COLORS.backgroundgrey,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  image: {
    width: 100,
    borderRadius: 8,
  },
  nativeButtonOverlay: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: APP_COLORS.offwhite,
  },
  iconButton: {
    position: "absolute",
    width: 50,
    height: 50,
  },
  iconButtonActive: {
    backgroundColor: SECTION_COLOR.sectionSecondaryColor,
  },
  dropCircleContainer: {
    flex: 1, // Take remaining space in the flashcard
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
  },
  emptyDropCircle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: SECTION_COLOR.sectionPrimaryColor,
    borderStyle: "dashed",
    backgroundColor: SECTION_COLOR.sectionSecondaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPool: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: SECTION_COLOR.sectionPrimaryColor,
    // borderStyle: "dashed",
    backgroundColor: SECTION_COLOR.sectionSecondaryColor,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  audioButtonContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  animatedBorder: {
    position: "absolute",
    borderStyle: "solid",
    zIndex: -1,
  },
});

// ------------------------------------------------------------
// DRAGGABLE BUTTON COMPONENT
// ------------------------------------------------------------

const DraggableButton: React.FC<DraggableButtonProps> = ({
  item,
  onAudioPlay,
  onDragStart,
  onDragEnd,
  buttonColor,
  targetPosition,
  isPlaced,
  isCorrect,
  isPlaying = false,
  disabled = false,
  onMarkDisabled,
  breatheDuration = 2000,
  animationBorderColor = "#4CAF50", // TODO: Refactor our green color?
  animationBorderWidth = 4,
  isLockedByGame = false,
}) => {
  // Track position of button
  const translateX: SharedValue<number> = useSharedValue<number>(0);
  const translateY: SharedValue<number> = useSharedValue<number>(0);
  const savedPosition: SharedValue<{ x: number; y: number }> = useSharedValue<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  // Track if currently dragging
  const isDragging: SharedValue<boolean> = useSharedValue<boolean>(false);

  // Track start time of touch
  const touchStartTime: SharedValue<number> = useSharedValue<number>(0);

  // Animation for audio playback
  const borderOpacity: SharedValue<number> = useSharedValue<number>(0);

  // Track original position (where the button starts in the button pool)
  const buttonRef = useRef<Reanimated.View>(null);
  const [buttonOrigin, setButtonOrigin] = useState<Position | null>(null);

  // Get button's original position
  useEffect(() => {
    const measureButton = () => {
      if (buttonRef.current) {
        buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
          console.log(`Button ${item.id} measured at:`, {
            x,
            y,
            width,
            height,
            pageX,
            pageY,
          });
          setButtonOrigin({ x: pageX, y: pageY, width, height });
        });
      }
    };

    // Slight delay to ensure component is rendered
    const timerId = setTimeout(measureButton, 100);
    return () => clearTimeout(timerId);
  }, [item.id]);

  // Reset incorrect button after feedback duration
  useEffect(() => {
    let timeoutId: number | undefined;

    if (isPlaced === true && isCorrect === false) {
      timeoutId = setTimeout(() => {
        // Reset position with animation
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);

        // Notify parent component about the reset
        runOnJS(onDragEnd)({ x: 0, y: 0 }, false);

        // Mark the button as disabled
        if (onMarkDisabled) {
          runOnJS(onMarkDisabled)(item.id);
        }
      }, INCORRECT_FEEDBACK_DURATION_MS);
    }

    // Clean up timeout on unmount or when dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isPlaced,
    isCorrect,
    onDragEnd,
    onMarkDisabled,
    item.id,
    translateX,
    translateY,
  ]);

  useEffect(() => {
    // Immediately reset position to origin when key/item changes
    translateX.value = 0;
    translateY.value = 0;
    savedPosition.value = { x: 0, y: 0 };

    // Schedule measuring after layout
    const measureButton = () => {
      if (buttonRef.current) {
        buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
          if (pageX > 0 && pageY > 0) {
            setButtonOrigin({
              x: pageX,
              y: pageY,
              width: width || BUTTON_SIZE,
              height: height || BUTTON_SIZE,
            });
          } else {
            // Retry measurement if it failed
            setTimeout(measureButton, 100);
          }
        });
      }
    };

    // Use a slightly longer delay to ensure layout is complete
    const timerId = setTimeout(measureButton, 200);
    return () => clearTimeout(timerId);
  }, [item.id, translateX, translateY, savedPosition]);

  // Function to stop breathing animation
  const stopAnimation = useCallback(() => {
    cancelAnimation(borderOpacity);
    borderOpacity.value = withTiming(0, { duration: 500 });
  }, [borderOpacity]);

  // Function to start breathing animation
  const startBreathingAnimation = useCallback(() => {
    // Reset opacity before starting animation
    borderOpacity.value = 0;

    // Start the animation sequence
    borderOpacity.value = withSequence(
      withTiming(0.6, { duration: breatheDuration / 2, easing: Easing.ease }),
      withRepeat(
        withSequence(
          withTiming(1, { duration: breatheDuration / 2, easing: Easing.ease }),
          withTiming(0.6, {
            duration: breatheDuration / 2,
            easing: Easing.ease,
          }),
        ),
        -1,
      ),
    );
  }, [borderOpacity, breatheDuration]);

  // Control animation based on isPlaying prop
  useEffect(() => {
    console.log(`Button ${item.id} isPlaying changed to: ${isPlaying}`);

    if (isPlaying) {
      console.log(`Starting animation for button ${item.id}`);
      startBreathingAnimation();
    } else {
      console.log(`Stopping animation for button ${item.id}`);
      stopAnimation();
    }

    // Add an explicit return function to stop animation on unmount or change
    return () => {
      console.log(`Cleanup animation for button ${item.id}`);
      cancelAnimation(borderOpacity);
      borderOpacity.value = 0;
    };
  }, [
    isPlaying,
    item.id,
    startBreathingAnimation,
    stopAnimation,
    borderOpacity,
  ]);

  // Define tap gesture
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      if (!isDragging.value && !disabled && !isLockedByGame && !isPlaying) {
        runOnJS(onAudioPlay)();
      }
    })
    .maxDuration(250)
    .enabled(!disabled && !isLockedByGame);

  // Define drag gesture
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      if (disabled || isLockedByGame) return;
      touchStartTime.value = Date.now();
      savedPosition.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      if (disabled || isLockedByGame) return;
      if (Date.now() - touchStartTime.value > DRAG_DELAY_MS) {
        if (!isDragging.value) {
          isDragging.value = true;
          runOnJS(onDragStart)();
        }

        translateX.value = savedPosition.value.x + event.translationX;
        translateY.value = savedPosition.value.y + event.translationY;
      }
    })
    .onEnd((event) => {
      if (disabled || isLockedByGame) {
        // If locked or disabled, and it was dragging, reset to origin
        if (isDragging.value) {
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          isDragging.value = false;
        }
        return;
      }
      if (isDragging.value) {
        const droppedX: number = event.absoluteX;
        const droppedY: number = event.absoluteY;

        // Detect if in drop area
        const isInDropArea: boolean =
          droppedY <
            (HEIGHT +
              HEADER_HEIGHT +
              FLASHCARD_HEIGHT -
              BOTTOM_TAB_HEIGHT -
              120) /
              2 &&
          droppedY > HEADER_HEIGHT && // Add a minimum bound
          droppedX > 0 &&
          droppedX < WIDTH;

        isDragging.value = false;

        // If we're in the drop area and have a valid target position, snap to target
        if (isInDropArea && targetPosition && buttonOrigin) {
          // Calculate center points
          const targetCenterX =
            targetPosition.x + (targetPosition.width || BUTTON_SIZE) / 2;
          const targetCenterY =
            targetPosition.y + (targetPosition.height || BUTTON_SIZE) / 2;
          const buttonCenterX =
            buttonOrigin.x + (buttonOrigin.width || BUTTON_SIZE) / 2;
          const buttonCenterY =
            buttonOrigin.y + (buttonOrigin.height || BUTTON_SIZE) / 2;

          // Calculate offset to align centers
          const offsetX = targetCenterX - buttonCenterX;
          const offsetY = targetCenterY - buttonCenterY;

          // Apply spring animation to move to target
          translateX.value = withSpring(offsetX, SPRING_CONFIG);
          translateY.value = withSpring(offsetY, SPRING_CONFIG);
        } else {
          // IMPORTANT: If not in drop area, always snap back to origin
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
        }

        // Notify parent component
        runOnJS(onDragEnd)(
          { x: droppedX, y: droppedY },
          isInDropArea && targetPosition !== null,
        );
      }
    });

  // Combine gestures
  const gesture = Gesture.Exclusive(dragGesture, tapGesture);

  // Animation style for position
  const animatedPositionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Animation style for breathing border
  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  // Determine the button color configuration based on state
  const getButtonColorProps = (): ButtonColorProps => {
    if (disabled) {
      return DISABLED_COLORS;
    }

    if (isPlaced) {
      return isCorrect ? CORRECT_COLORS : INCORRECT_COLORS;
    }

    return buttonColor;
  };

  // Get the current color configuration
  const currentColors = getButtonColorProps();

  // Create props for EnglishButton
  const iconButtonProps: ButtonColorProps = {
    primaryColor: currentColors.primaryColor,
    secondaryColor: currentColors.secondaryColor,
    offwhiteColor: currentColors.offwhiteColor,
    offblackColor: currentColors.offblackColor,
    backgroundColor: currentColors.backgroundColor,
  };

  return (
    <GestureDetector gesture={gesture}>
      <Reanimated.View
        ref={buttonRef}
        style={[styles.audioButtonContainer, animatedPositionStyle]}
      >
        {/* Animated border for audio playback */}
        <Reanimated.View
          style={[
            styles.animatedBorder,
            {
              borderColor: animationBorderColor,
              borderWidth: animationBorderWidth,
              width: BUTTON_SIZE + animationBorderWidth * 2,
              height: BUTTON_SIZE + animationBorderWidth * 2,
              borderRadius: (BUTTON_SIZE + animationBorderWidth * 2) / 2,
            },
            animatedBorderStyle,
          ]}
        />
        <EnglishButton {...iconButtonProps} />
      </Reanimated.View>
    </GestureDetector>
  );
};

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

const DraggableAudioGame: React.FC = () => {
  // State for tracking if the flashcard is in "active" state (being dragged over)
  const [isCardActive, setIsCardActive] = useState<boolean>(false);

  // Store the target drop circle position
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);

  // Track which button is currently placed in the target
  const [placedButtonId, setPlacedButtonId] = useState<string | null>(null);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);
  const [disabledButtons, setDisabledButtons] = useState<string[]>([]);

  // Audio playback tracking
  const [playingButtonId, setPlayingButtonId] = useState<string | null>(null);
  const currentSound = useRef<AudioPlayer | null>(null);

  // Game state
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [currentGameSetIndex, setCurrentGameSetIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  // ADDED: State to lock interactions globally for the game
  const [isGameInteractionLocked, setIsGameInteractionLocked] =
    useState<boolean>(false);

  // Reference to target drop circle
  const dropCircleRef = useRef<ViewInstance>(null);

  useEffect(() => {
    const newGameSets = shuffleArray([
      ...VOCABULARY_WORD_LIST_BY_LEVEL.LEVEL_1,
    ]).map(
      (word: string): GameSet => ({
        correctAnswer: word,
        options: generateMultipleChoiceOptions(
          VOCABULARY_WORD_LIST_BY_LEVEL.LEVEL_1,
          word,
          3,
        ),
      }),
    );
    setGameSets(newGameSets);
  }, []);

  const advanceNextGame = useCallback(() => {
    const nextIndex = (currentGameSetIndex + 1) % gameSets.length;
    if (nextIndex === 0) {
      // Reshuffle for the next loop
      const newGameSets = shuffleArray([...gameSets]);
      setGameSets(newGameSets);
    }
    setCurrentGameSetIndex(nextIndex);
  }, [currentGameSetIndex, gameSets]);

  const currentGameSet = gameSets[currentGameSetIndex];

  // Function to get the absolute position of the target drop circle
  const measureDropCircle = useCallback((): void => {
    console.log("Attempting to measure drop circle");

    // Give a little more time for layout to complete
    setTimeout(() => {
      if (dropCircleRef.current) {
        dropCircleRef.current.measure((x, y, width, height, pageX, pageY) => {
          console.log("Drop circle measured at:", {
            x,
            y,
            width,
            height,
            pageX,
            pageY,
          });

          if (width > 0 && height > 0 && pageX > 0 && pageY > 0) {
            // Store the position with explicit values to avoid undefined issues
            setTargetPosition({
              x: pageX,
              y: pageY,
              width: width || BUTTON_SIZE,
              height: height || BUTTON_SIZE,
            });
          } else {
            // Retry if measurement failed
            console.log("Measurement failed, retrying...");
            setTimeout(measureDropCircle, 200);
          }
        });
      }
    }, 100);
  }, []);

  const shuffleCurrentOptions = useCallback(() => {
    if (currentGameSet) {
      const shuffled = shuffleArray([...currentGameSet.options]);
      setShuffledOptions(shuffled);
    }
  }, [currentGameSet]);

  const resetAllButtonPositions = useCallback(() => {
    // Cancel any ongoing animations that might interfere
    if (currentSound.current) {
      releasePlayer(currentSound.current);
      currentSound.current = null;
    }

    // Deactivate keep awake when audio stops
    deactivateKeepAwake("audio-playback-l4");

    // First clear all states
    setPlayingButtonId(null);
    setIsCardActive(false);
    setDisabledButtons([]);
    setPlacedButtonId(null);
    setIsCorrectAnswer(null);
    setIsGameInteractionLocked(false);

    // Schedule the next game setup after state updates have completed
    setTimeout(() => {
      // Get current game set and shuffle options
      if (gameSets[currentGameSetIndex]) {
        shuffleCurrentOptions();
        // Force re-measurement after layout is updated with a longer delay
        setTimeout(measureDropCircle, 300);
      }
    }, 50);
  }, [currentGameSetIndex, measureDropCircle, gameSets, shuffleCurrentOptions]);

  useEffect(() => {
    resetAllButtonPositions();
  }, [currentGameSetIndex, resetAllButtonPositions]);

  useEffect(() => {
    if (gameSets.length > 0 && shuffledOptions.length === 0) {
      shuffleCurrentOptions();
    }
  }, [shuffledOptions.length, gameSets, shuffleCurrentOptions]);

  // Current game data
  const Svg = useMemo(() => {
    return currentGameSet
      ? requireImageForWord(currentGameSet.correctAnswer)
      : null;
  }, [currentGameSet]);

  // Function to play audio - simplified for reliability
  const playAudio = useCallback(
    async (audioFile: any, buttonId: string): Promise<void> => {
      console.log("Playing audio for button:", buttonId);

      // Stop any currently playing audio globally
      await audioStoreActions.stopAllAudio();

      // Stop any currently playing audio from this component
      if (currentSound.current) {
        try {
          releasePlayer(currentSound.current);
        } catch (e) {
          // Ignore error cleaning up previous sound
        }
        currentSound.current = null;
      }

      activateKeepAwakeAsync("audio-playback-l4");

      // Set this button as the playing one
      setPlayingButtonId(buttonId);

      try {
        const sound = createAudioPlayer(audioFile);
        sound.play();

        // Store the current sound
        currentSound.current = sound;

        // Create a variable to track if this specific sound instance has been handled
        let isHandled = false;

        // Listen for playback status updates
        sound.addListener("playbackStatusUpdate", (status) => {
          if (isHandled) return;

          if (!status.isLoaded) return;

          if (status.didJustFinish) {
            console.log(`Audio finished for button ${buttonId}`);
            isHandled = true;

            deactivateKeepAwake("audio-playback-l4");

            // Force update the playing button ID state
            setPlayingButtonId((prevId) => {
              if (prevId === buttonId) {
                console.log(
                  `Clearing playing button ID from ${prevId} to null`,
                );
                return null;
              }
              return prevId;
            });

            // Clear from global audio store
            audioStoreActions.clearCurrentSound();

            // Unload the sound
            try {
              releasePlayer(sound);
            } catch (e) {
              // Ignore error
            }
            if (currentSound.current === sound) {
              currentSound.current = null;
            }
          }
        });

        // Register with global audio store
        await audioStoreActions.registerSound(sound);

        // Add a safety timeout
        const timeoutId = setTimeout(() => {
          if (isHandled) return;

          isHandled = true;
          console.log(`Safety timeout reached for button ${buttonId}`);

          deactivateKeepAwake("audio-playback-l4");

          setPlayingButtonId((prevId) => {
            if (prevId === buttonId) {
              console.log(
                `Clearing playing button ID from ${prevId} to null (timeout)`,
              );
              return null;
            }
            return prevId;
          });

          audioStoreActions.clearCurrentSound();

          try {
            try {
              releasePlayer(sound);
            } catch (e) {
              // Ignore error
            }
            if (currentSound.current === sound) {
              currentSound.current = null;
            }
          } catch (e) {
            console.error("Error cleaning up sound in timeout:", e);
          }
        }, 5000);

        // Set up cleanup but don't return it directly
        // This fixes the "Type '() => void' is not assignable to type 'void'" error
        setTimeout(() => {
          clearTimeout(timeoutId);
        }, 6000);
      } catch (error) {
        console.error("Error playing audio:", error);
        deactivateKeepAwake("audio-playback-l4");
        setPlayingButtonId(null);
      }
    },
    [],
  );

  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      if (currentSound.current) {
        try {
          releasePlayer(currentSound.current);
        } catch (e) {
          // Ignore error
        }
        currentSound.current = null;
      }
    };
  }, []);

  // Measure the drop circle position when the component mounts
  useEffect(() => {
    // Use setTimeout to ensure the layout is complete before measuring
    const timerId = setTimeout(() => {
      measureDropCircle();
    }, 500);

    return () => clearTimeout(timerId);
  }, [measureDropCircle]);

  // Handle drag end for buttons
  const handleDragEnd = useCallback(
    (
      position: Position,
      buttonId: string,
      isInTarget: boolean,

      CORRECT_BUTTON_ID: string,
      // TODO: CORRECT_BUTTON_ID is already declared in the upper scope on line 731 column 9  @typescript-eslint/no-shadow
    ): void => {
      setIsCardActive(false);

      if (isInTarget) {
        setIsGameInteractionLocked(true);
        setPlacedButtonId(buttonId);
        const isCorrect = buttonId === CORRECT_BUTTON_ID;
        setIsCorrectAnswer(isCorrect);

        // If answer is correct, set a timeout to advance to next game
        if (isCorrect) {
          // Slight delay to show the correct feedback
          setTimeout(() => {
            // Stop any ongoing animations or sounds
            if (currentSound.current) {
              releasePlayer(currentSound.current);
              currentSound.current = null;
            }
            setPlayingButtonId(null);
            // Game lock will be released by resetAllButtonPositions when game set changes
            advanceNextGame();
          }, 1500); // Wait 1.5 seconds before advancing
        } else {
          // Incorrect answer, feedback (and subsequent call to onDragEnd with isInTarget:false)
          // is handled by DraggableButton's useEffect. The lock will be released there.
        }
      } else if (placedButtonId === buttonId) {
        // This button was the one in the target and is now being reset/removed
        setPlacedButtonId(null);
        setIsCorrectAnswer(null);
        setIsGameInteractionLocked(false);
      }
      // If a button is just dragged and dropped outside, and it wasn't the 'placedButtonId',
      // we DON'T change isGameInteractionLocked, as another button might still be in the target and being processed.
    },
    [placedButtonId, advanceNextGame],
  );

  // Available audio buttons using shuffled options
  const availableButtons: ButtonItem[] = useMemo(
    () =>
      shuffledOptions.map((word: string) => {
        return { id: word, word: word };
      }),
    [shuffledOptions],
  );

  if (gameSets.length === 0 || !currentGameSet) {
    return null; // Or a loading spinner, ensures hooks are called before this
  }
  const CORRECT_BUTTON_ID: string = currentGameSet.correctAnswer;
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Flashcard */}
      <View style={styles.flashcardContainer}>
        <View
          style={[styles.flashcard, isCardActive && styles.flashcardActive]}
          // onLayout={() => setTimeout(measureDropCircle, 100)}
          onLayout={() => {
            console.log("Flashcard layout complete");
            // Delay measurement to ensure child components are laid out
            setTimeout(measureDropCircle, 100);
          }}
        >
          <View style={styles.imageContainer}>
            {Svg && (
              <Svg
                style={styles.image}
                height="60%"
                width="60%"
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            {/* Native Button */}
            <View
              style={[
                styles.nativeButtonOverlay,
                isCardActive && styles.iconButtonActive,
              ]}
            />
            <View style={[styles.iconButton, { top: 0, right: 0 }]}>
              <AnimatedAudioButton
                audioSource={requireCompleteNativeAudioForWord(
                  CORRECT_BUTTON_ID,
                )}
                width={50}
                height={50}
              >
                <NativeButton {...NATIVE_BUTTON_COLOR} />
              </AnimatedAudioButton>
            </View>
          </View>

          {/* Drop target */}
          {/* <View style={styles.dropAreaContainer}> */}
          <View style={styles.dropCircleContainer}>
            <View ref={dropCircleRef} style={styles.emptyDropCircle} />
          </View>
        </View>
      </View>
      {/* Button Pool */}
      {/* TODO: Make only top border dashed: https://github.com/facebook/react-native/issues/7838 */}
      <View style={styles.buttonPool}>
        {availableButtons.map((item: ButtonItem, index: number) => (
          <DraggableButton
            key={`${item.id}-${currentGameSetIndex}`}
            item={item}
            onAudioPlay={() =>
              playAudio(requireCompleteEnglishAudioForWord(item.word), item.id)
            }
            onDragStart={() => setIsCardActive(true)}
            onDragEnd={(pos, isInTarget) =>
              handleDragEnd(pos, item.id, isInTarget, CORRECT_BUTTON_ID)
            }
            buttonColor={BUTTON_COLORS[index % BUTTON_COLORS.length]}
            targetPosition={targetPosition}
            isPlaced={placedButtonId === item.id}
            isCorrect={placedButtonId === item.id ? isCorrectAnswer : null}
            disabled={disabledButtons.includes(item.id)}
            isLockedByGame={isGameInteractionLocked}
            isPlaying={playingButtonId === item.id}
            onMarkDisabled={(buttonId: string) =>
              setDisabledButtons((prev) => [...prev, buttonId])
            }
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
};

const Screen = () => {
  const {
    playGuideAudio,
    stopGuideAudio,
    isPlaying: isPlayingGuidanceAudio,
  } = useGuideAudio({
    screenName: "audio-multiple-choice-tab",
    module: "vocabulary-module",
  });

  const screenStyles = StyleSheet.create({
    content: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between", // Space between header, game, bottom tab bar
    },
  });

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "left", "right"]}
    >
      <View style={screenStyles.content}>
        <GuidanceAudioHeader
          title="Audio Multiple Choice"
          isPlaying={isPlayingGuidanceAudio}
          onPressGuide={playGuideAudio}
          onStopGuide={stopGuideAudio}
          showLetterCaseSwitch={false}
        />
        <DraggableAudioGame />
      </View>
    </SafeAreaView>
  );
};

export default Screen;
