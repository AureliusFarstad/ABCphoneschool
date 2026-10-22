import type { AudioPlayer } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useFocusEffect } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  requireEnglishConversationAudio,
  requireNativeConversationAudio,
} from "@/assets/conversation";
import { SECTION_COLORS } from "@/constants/routes";
import { APP_COLORS } from "@/constants/routes";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import { audioStoreActions, releasePlayer } from "@/core/store/audio";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { AnimatedAudioButton } from "@/ui/icons/animated-audio-button-wrapper";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EnglishButton } from "@/ui/icons/circular/english-button";
import { NativeButton } from "@/ui/icons/circular/native-button";
import { PlayButton } from "@/ui/icons/circular/play-button";
import { UserAvatar } from "@/ui/illustrations";
import { globalStyles } from "@/ui/styles";

const primaryColor = SECTION_COLORS.speaking;
const secondaryColor = SECTION_COLORS.vocabulary;

const femaleButtonProps = {
  primaryColor: primaryColor.primary,
  secondaryColor: primaryColor.light,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const maleButtonProps = {
  primaryColor: secondaryColor.primary,
  secondaryColor: secondaryColor.light,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const DISABLED_COLORS = {
  primaryColor: "#F2EFF0",
  offwhiteColor: "#FAFAFA",
  offblackColor: "#D4D4D8",
  secondaryColor: "#888888",
  backgroundColor: "#F5F5F5",
};

const NATIVE_DISABLED_COLORS = {
  primaryColor: "#F2EFF0",
  offwhiteColor: "#FAFAFA",
  offblackColor: "#D4D4D8",
  secondaryColor: "#F2EFF0",
  backgroundColor: "#F5F5F5",
};

// Define color props for the PlayButton
const activePlayButtonColorProps: ButtonColorProps = {
  primaryColor: SECTION_COLORS.speaking.primary,
  secondaryColor: APP_COLORS.lightgreen,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const disabledPlayButtonColorProps: ButtonColorProps = {
  primaryColor: APP_COLORS.grey,
  secondaryColor: APP_COLORS.backgroundgrey,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.grey,
};

interface ConversationCardProps {
  gender: "female" | "male";
  englishAudioFile: string;
  nativeAudioFile: string;
  state: "completed" | "disabled" | "hidden" | "playing";
  onAudioComplete?: () => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  gender = "male",
  englishAudioFile,
  nativeAudioFile,
  state,
  onAudioComplete,
}) => {
  const [sound, setSound] = React.useState<AudioPlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const hasAutoPlayed = React.useRef(false);

  const isDisabled = state === "disabled";
  const isPlayingState = state === "playing";

  const isCurrentlyPlayingSV = useSharedValue(isPlayingState);

  React.useEffect(() => {
    isCurrentlyPlayingSV.value = isPlayingState;
  }, [isPlayingState, isCurrentlyPlayingSV]);

  const buttonProps = isDisabled
    ? DISABLED_COLORS
    : gender === "female"
      ? femaleButtonProps
      : maleButtonProps;

  const nativeButtonProps = isDisabled
    ? NATIVE_DISABLED_COLORS
    : gender === "female"
      ? femaleButtonProps
      : maleButtonProps;

  const cardBorderColor = isDisabled
    ? DISABLED_COLORS.primaryColor
    : gender === "female"
      ? primaryColor.primary
      : secondaryColor.primary;

  React.useEffect(() => {
    const currentSound = sound;
    return () => {
      if (currentSound) {
        currentSound.removeAllListeners("playbackStatusUpdate");
        try {
          releasePlayer(currentSound);
        } catch (e) {
          console.warn(
            `[ConversationCard ${gender}] Error unloading sound in cleanup:`,
            (e as Error).message,
          );
        }
      }
    };
  }, [sound, gender]);

  const playEnglishAudio = React.useCallback(async () => {
    console.log("Playing English audio");
    try {
      // Stop any currently playing audio globally
      await audioStoreActions.stopAllAudio();

      if (sound) {
        try {
          sound.removeAllListeners("playbackStatusUpdate");
          releasePlayer(sound);
        } catch (e: unknown) {
          console.warn(
            `[playEnglishAudio on card ${gender}] Warning: Error stopping/unloading previous sound: `,
            (e as Error).message,
          );
        }
      }

      setIsPlaying(true);

      const source =
        typeof englishAudioFile === "string" && englishAudioFile.includes("mp3")
          ? { uri: englishAudioFile }
          : englishAudioFile;

      const newSound = createAudioPlayer(source);
      setSound(newSound);

      newSound.addListener("playbackStatusUpdate", (status) => {
        // Status updates arrive before the sound has loaded; ignore those
        if (!status.isLoaded) {
          return;
        }

        if (status.didJustFinish) {
          console.log("Audio finished");
          setIsPlaying(false);
          deactivateKeepAwake("conversation-audio");
          audioStoreActions.clearCurrentSound();
          onAudioComplete?.();
          return;
        }

        if (isPlaying && !status.playing && !status.didJustFinish) {
          console.log(
            "Playback stopped unexpectedly (isLoaded=true, but not playing and not finished).",
          );
          setIsPlaying(false);
          deactivateKeepAwake("conversation-audio");
          audioStoreActions.clearCurrentSound();
          onAudioComplete?.();
        }
      });

      // Register with global audio store. When another sound stops this one,
      // finish the card, as expo-av did when it reported the sound unloaded.
      await audioStoreActions.registerSound(newSound, () => {
        setIsPlaying(false);
        deactivateKeepAwake("conversation-audio");
        onAudioComplete?.();
      });

      newSound.play();
    } catch (error: unknown) {
      console.error("Error playing English audio:", (error as Error).message);
      onAudioComplete?.();
    }
  }, [
    sound,
    englishAudioFile,
    onAudioComplete,
    setSound,
    isPlaying,
    setIsPlaying,
    gender,
  ]);

  React.useEffect(() => {
    if (isPlayingState && !hasAutoPlayed.current) {
      console.log("State changed to playing, starting audio...");
      hasAutoPlayed.current = true;
      activateKeepAwakeAsync("conversation-audio");
      playEnglishAudio();
    }

    if (!isPlayingState) {
      hasAutoPlayed.current = false;
      if (isPlaying) {
        setIsPlaying(false);
        deactivateKeepAwake("conversation-audio");
        if (sound) {
          sound.removeAllListeners("playbackStatusUpdate");
          try {
            sound.pause();
          } catch (e) {
            console.error(
              `[ConversationCard ${gender}] Error stopping sound on state change:`,
              e,
            );
          }
        }
      }
    }
  }, [
    isPlayingState,
    playEnglishAudio,
    isPlaying,
    sound,
    setIsPlaying,
    gender,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isCurrentlyPlayingSV.value) {
      return {
        opacity: withRepeat(
          withSequence(
            withTiming(1, { duration: 1000, easing: Easing.ease }),
            withTiming(0.6, { duration: 1000, easing: Easing.ease }),
          ),
          -1,
          false,
        ),
      };
    } else {
      return {
        opacity: withTiming(0, { duration: 300 }),
      };
    }
  });

  if (state === "hidden") {
    return null;
  }

  return (
    <View
      style={[
        styles.chatRow,
        gender === "female" ? styles.femaleChatRow : styles.maleChatRow,
      ]}
      pointerEvents={isDisabled ? "none" : "auto"}
    >
      {gender === "female" && (
        <View
          style={[styles.avatarWrapper, isDisabled && styles.disabledAvatar]}
        >
          <UserAvatar gender="f" name="a" />
        </View>
      )}
      <View
        style={[
          styles.speakerCard,
          {
            borderColor: cardBorderColor,
            backgroundColor: isDisabled
              ? DISABLED_COLORS.backgroundColor
              : APP_COLORS.offwhite,
          },
        ]}
      >
        {isPlayingState ? (
          <>
            <View style={styles.button}>
              <NativeButton
                {...NATIVE_DISABLED_COLORS}
                width={80}
                height={80}
              />
            </View>

            <View style={styles.playingButtonWrapper}>
              <View style={styles.playingButtonContainer}>
                <Animated.View
                  style={[
                    styles.playingBorder,
                    {
                      borderColor: APP_COLORS.green,
                      borderWidth: 4,
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                    },
                    animatedStyle,
                  ]}
                />
                <View style={styles.playingButton}>
                  <EnglishButton {...buttonProps} />
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <AnimatedAudioButton
              audioSource={nativeAudioFile}
              width={80}
              height={80}
            >
              <View style={styles.button}>
                <NativeButton {...nativeButtonProps} width={80} height={80} />
              </View>
            </AnimatedAudioButton>
            <AnimatedAudioButton
              audioSource={englishAudioFile}
              width={80}
              height={80}
            >
              <View style={styles.button}>
                <EnglishButton {...buttonProps} />
              </View>
            </AnimatedAudioButton>
          </>
        )}
      </View>
      {gender === "male" && (
        <View
          style={[styles.avatarWrapper, isDisabled && styles.disabledAvatar]}
        >
          <UserAvatar gender="m" name="b" />
        </View>
      )}
    </View>
  );
};

const Listening: React.FC = () => {
  const NUMBER_OF_CARDS = 4;
  const [playSessionId, setPlaySessionId] = React.useState(0);
  const [hasCompletedFirstFullCycle, setHasCompletedFirstFullCycle] =
    React.useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const [cardStates, setCardStates] = React.useState<
    ("completed" | "disabled" | "hidden" | "playing")[]
  >(Array(NUMBER_OF_CARDS).fill("hidden"));

  const { playGuideAudio, isPlaying: isGuidePlaying } = useGuideAudio({
    screenName: "listening-tab",
    module: "conversation-module",
  });

  const handleAudioComplete = () => {
    console.log("Audio completed! Move to next card.");
    setCardStates((prevStates) => {
      const currentPlayingIndex = prevStates.findIndex((s) => s === "playing");

      if (currentPlayingIndex === -1) {
        console.warn(
          "handleAudioComplete called but no card was in playing state.",
        );
        return prevStates;
      }

      const newStates = [...prevStates] as typeof prevStates;
      newStates[currentPlayingIndex] = "disabled";

      const nextCardIndex = currentPlayingIndex + 1;

      console.log(
        `[handleAudioComplete] SessionID: ${playSessionId}, PrevStates: ${JSON.stringify(prevStates)}, currentPlayingIndex: ${currentPlayingIndex}, nextCardIndex: ${nextCardIndex}, NUMBER_OF_CARDS: ${NUMBER_OF_CARDS}`,
      );

      if (nextCardIndex < NUMBER_OF_CARDS) {
        newStates[nextCardIndex] = "playing";
        for (let i = nextCardIndex + 1; i < NUMBER_OF_CARDS; i++) {
          if (newStates[i] !== "disabled" && newStates[i] !== "completed") {
            newStates[i] = "hidden";
          }
        }
      } else {
        console.log(
          "[handleAudioComplete] END OF SEQUENCE DETECTED. Setting all to completed.",
        );
        if (!hasCompletedFirstFullCycle) {
          setHasCompletedFirstFullCycle(true);
          console.log("[handleAudioComplete] First full cycle completed.");
        }
        // Scroll to top when conversation ends
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        return Array(NUMBER_OF_CARDS).fill("completed") as typeof prevStates;
      }
      // If not end of sequence, but a card became playing, scroll to end
      // This is handled by the useEffect watching cardStates for a 'playing' card
      return newStates;
    });
  };

  const handlePlayPress = () => {
    console.log("Play button pressed - starting first card, new session.");
    setPlaySessionId((prevId) => prevId + 1);

    setCardStates((prevStates) => {
      const newStates = Array(NUMBER_OF_CARDS).fill(
        "hidden",
      ) as typeof prevStates;
      if (NUMBER_OF_CARDS > 0) {
        newStates[0] = "playing";
      }
      return newStates;
    });
  };

  const isConversationActive = React.useMemo(
    () => cardStates.some((s) => s === "playing" || s === "disabled"),
    [cardStates],
  );

  React.useEffect(() => {
    const isPlayingCardPresent = cardStates.some((s) => s === "playing");
    if (isPlayingCardPresent && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [cardStates]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        console.log("Listening screen blurred.");

        setCardStates((currentCardStates) => {
          const isAnyCardPlaying = currentCardStates.some(
            (s) => s === "playing",
          );
          let newStates = [...currentCardStates];

          if (!hasCompletedFirstFullCycle) {
            const hasPartialProgressInFirstCycle = currentCardStates.some(
              (s) => s === "playing" || s === "disabled",
            );

            if (hasPartialProgressInFirstCycle) {
              console.log(
                "Blur during first ever playthrough cycle (in progress): Resetting all cards to hidden and session.",
              );
              newStates = Array(NUMBER_OF_CARDS).fill("hidden");
              setPlaySessionId(0);
            }
          } else {
            if (isAnyCardPlaying) {
              console.log(
                "Blur during a later playthrough cycle (audio active): Setting all cards to completed.",
              );
              newStates = Array(NUMBER_OF_CARDS).fill("completed");
            }
          }
          return newStates as typeof currentCardStates;
        });
      };
    }, [hasCompletedFirstFullCycle, NUMBER_OF_CARDS, setPlaySessionId]),
  );

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "left", "right"]}
    >
      <GuidanceAudioHeader
        title="Sound"
        isPlaying={isGuidePlaying}
        onPressGuide={playGuideAudio}
        showLetterCaseSwitch={false}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContentContainer}
      >
        <View style={styles.playButtonArea}>
          <TouchableOpacity
            onPress={handlePlayPress}
            style={styles.playButtonWrapper}
            disabled={isConversationActive}
          >
            <PlayButton
              width={80}
              height={80}
              {...(isConversationActive
                ? disabledPlayButtonColorProps
                : activePlayButtonColorProps)}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.conversationContainer} key={playSessionId}>
          <ConversationCard
            gender="female"
            englishAudioFile={requireEnglishConversationAudio(
              "part1",
              "female",
            )}
            nativeAudioFile={requireNativeConversationAudio("part1", "female")}
            state={cardStates[0]}
            onAudioComplete={handleAudioComplete}
          />
          <ConversationCard
            gender="male"
            englishAudioFile={requireEnglishConversationAudio("part2", "male")}
            nativeAudioFile={requireNativeConversationAudio("part2", "male")}
            state={cardStates[1]}
            onAudioComplete={handleAudioComplete}
          />
          <ConversationCard
            gender="female"
            englishAudioFile={requireEnglishConversationAudio(
              "part3",
              "female",
            )}
            nativeAudioFile={requireNativeConversationAudio("part3", "female")}
            state={cardStates[2]}
            onAudioComplete={handleAudioComplete}
          />
          <ConversationCard
            gender="male"
            englishAudioFile={requireEnglishConversationAudio("part4", "male")}
            nativeAudioFile={requireNativeConversationAudio("part4", "male")}
            state={cardStates[3]}
            onAudioComplete={handleAudioComplete}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  playButtonArea: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  playButtonWrapper: {},
  scrollView: {
    flex: 1,
    backgroundColor: "#F2EFF0",
  },
  scrollViewContentContainer: {},
  conversationContainer: {
    backgroundColor: "#F2EFF0",
    paddingVertical: 8,
  },
  chatRow: {
    flexDirection: "row",
    margin: 12,
    gap: 12,
  },
  femaleChatRow: {
    justifyContent: "flex-start",
  },
  maleChatRow: {
    justifyContent: "flex-end",
  },
  avatarWrapper: {
    width: 60,
    height: 60,
  },
  disabledAvatar: {
    opacity: 0.3,
  },
  speakerCard: {
    height: 120,
    width: 220,
    borderWidth: 2,
    borderRadius: 12,
    margin: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  button: {
    width: 80,
    height: 80,
  },
  playingButtonWrapper: {
    width: 88,
    height: 88,
  },
  playingButtonContainer: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  playingBorder: {
    position: "absolute",
    borderStyle: "solid",
  },
  playingButton: {
    width: 80,
    height: 80,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Listening;
