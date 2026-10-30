import clsx from "clsx";
import type { AudioPlayer, AudioSource, AudioStatus } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import React, { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import Svg, { Line } from "react-native-svg";

import { APP_COLORS } from "@/constants/routes";
import { MS_300 } from "@/constants/timing";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import { audioStoreActions, releasePlayer } from "@/core/store/audio";
import { useLevelStore } from "@/core/store/levels";
import { Pressable, SafeAreaView, Text, View } from "@/ui";
import AnimatedLetterComponent from "@/ui/components/home/animated-letter-component";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { AnimatedBreathingView } from "@/ui/icons/animated-breathing-view";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EarButton } from "@/ui/icons/circular/ear-button";
import { NameButton } from "@/ui/icons/circular/name-button";
import { PencilButton } from "@/ui/icons/circular/pencil-button";
import { globalStyles } from "@/ui/styles";
import { WIDTH } from "@/utils/layout";

import { SECTION_COLOR } from "./_layout";

type AnimatedLetterComponentRef = {
  animateLowercase: () => void;
  animateUppercase: () => void;
};

const PageLinesSVG = () => {
  return (
    <View className=" overflow-hidden">
      <Svg
        width={WIDTH - 16}
        height="180"
        viewBox={`0 0 ${WIDTH - 16} 143`}
        fill="none"
      >
        <Line
          x1="-9.00391"
          y1="141.295"
          x2={WIDTH - 16}
          y2="141.295"
          stroke="#E4E4E7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 8"
        />
        <Line
          x1="-10.0039"
          y1="96.8115"
          x2={WIDTH - 16}
          y2="96.8115"
          stroke="#E4E4E7"
          strokeWidth="2"
        />
        <Line
          x1="-9.00391"
          y1="46.3955"
          x2={WIDTH - 16}
          y2="46.3955"
          stroke="#E4E4E7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 8"
        />
        <Line
          x1="-10.0039"
          y1="1.91113"
          x2={WIDTH - 16}
          y2="1.91113"
          stroke="#E4E4E7"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

const VERTICAL_OFFSET = -9;

// TODO: Refactor this out to _layout?
const buttonStyles: ButtonColorProps = {
  primaryColor: SECTION_COLOR.primary,
  secondaryColor: SECTION_COLOR.dark,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const LetterIntroduction = () => {
  const { levels, updateLevels } = useLevelStore();
  const [sound, setSound] = useState<AudioPlayer>();

  const [isAlphabeticPlaying, setIsAlphabeticPlaying] = useState(false);
  const [isPhoneticPlaying, setIsPhoneticPlaying] = useState(false);
  const [hasPlayedGuidanceOnce, setHasPlayedGuidanceOnce] = useState(false);

  // const [isAnimating, setIsAnimating] = useState(false);
  const onAnimationStart = () => {
    // setIsAnimating(true);
  };

  const { playGuideAudio, stopGuideAudio, isPlaying } = useGuideAudio({
    screenName: "letter-introduction",
    module: "alphabet-module",
  });

  // const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  // const [tappedAnswer, setTappedAnswer] = useState<IOption>();

  const [activeActivity, setActiveActivity] = useState(
    levels[0].modules[0].sections[0].activities[0],
  );

  const animatedLetterRef = useRef<AnimatedLetterComponentRef | null>(null);

  const activitiesInCurrentSection =
    levels[0].modules[0].sections[0].activities;

  const playSound = async (playbackSource: AudioSource) => {
    try {
      // Stop any currently playing audio globally
      await audioStoreActions.stopAllAudio();

      if (sound) {
        try {
          releasePlayer(sound);
        } catch (e) {
          // Ignore error if sound is already unloaded
        }
      }

      // Activate keep awake when starting audio
      activateKeepAwakeAsync("letter-audio");

      const soundResponse = createAudioPlayer(playbackSource);
      soundResponse.play();

      setSound(soundResponse);

      const completionPromise = new Promise<void>((resolve, _reject) => {
        const onPlaybackStatusUpdate = (status: AudioStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            deactivateKeepAwake("letter-audio");
            audioStoreActions.clearCurrentSound();
            try {
              releasePlayer(soundResponse);
              resolve();
            } catch (e) {
              console.warn("Error unloading sound:", e);
            }
          }
        };

        soundResponse.addListener(
          "playbackStatusUpdate",
          onPlaybackStatusUpdate,
        );
      });

      // Register with global audio store AFTER setting up listeners
      await audioStoreActions.registerSound(soundResponse);

      return completionPromise;
    } catch (error) {
      console.log("error in playSound", error);
      deactivateKeepAwake("letter-audio");
      throw error;
    }
  };

  useEffect(() => {
    return sound
      ? () => {
          releasePlayer(sound);
        }
      : undefined;
  }, [sound, activeActivity]);

  const incrementProgress = (
    type:
      | "PHONETIC_SOUND"
      | "ALPHABETIC_SOUND"
      | "UPPERCASE_LETTER"
      | "LOWERCASE_LETTER",
  ) => {
    const _updatedLevels = levels.map((level: ILevel) => {
      if (level.id !== levels[0].id) return level;

      const _updatedModules = level.modules.map((sublevel) => {
        if (sublevel.id !== levels[0].modules[0].id) return sublevel;

        const _updatedSections = sublevel.sections.map((section: ISection) => {
          if (section.id !== levels[0].modules[0].sections[0].id)
            return section;

          const _updatedActivities = section.activities.map(
            (activity: IActivity) => {
              if (activity.id !== activeActivity.id) return activity;
              const updatedProgress = {
                ...activity.progress,
              } as ILetterIntroductionProgress;
              if (type === "ALPHABETIC_SOUND") {
                updatedProgress.alphabeticSoundPlayCount += 1;
              } else if (type === "PHONETIC_SOUND") {
                updatedProgress.phoneticSoundPlayCount += 1;
              } else if (type === "UPPERCASE_LETTER") {
                updatedProgress.uppercaseReadCount += 1;
              } else if (type === "LOWERCASE_LETTER") {
                updatedProgress.lowercaseReadCount += 1;
              }
              return {
                ...activity,
                progress: {
                  ...updatedProgress,
                },
              };
            },
          );

          return {
            ...section,
            activities: _updatedActivities,
          };
        });

        return {
          ...sublevel,
          sections: _updatedSections,
        };
      });

      return {
        ...level,
        modules: _updatedModules,
      };
    });
    updateLevels(_updatedLevels);

    setTimeout(() => {
      const updatedActiveActivity =
        levels[0].modules[0].sections[0].activities.find(
          (activity) => activity.id === activeActivity.id,
        );
      if (updatedActiveActivity) {
        setActiveActivity(updatedActiveActivity);
      }
    }, MS_300);
  };

  const onAnimationComplete = (letter: string) => {
    // setIsAnimating(false);
    if (letter === activeActivity.letter.upperCase) {
      incrementProgress("UPPERCASE_LETTER");
    } else if (letter === activeActivity.letter.lowerCase) {
      incrementProgress("LOWERCASE_LETTER");
      console.log("animation completed");
    }
  };

  useEffect(() => {
    const isCompleted = activitiesInCurrentSection.every((activity) => {
      if (!activity.progress) return false;
      return Object.values(activity.progress).every((count) => count >= 1);
    });
    if (isCompleted) {
      Alert.alert("Done");
    }
  }, [activitiesInCurrentSection, levels]);

  const handlePlayGuideAudio = () => {
    if (!hasPlayedGuidanceOnce) {
      setHasPlayedGuidanceOnce(true);
    }
    playGuideAudio();
  };

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "left", "right"]}
    >
      <GuidanceAudioHeader
        title="Letter Introduction"
        isPlaying={isPlaying}
        onPressGuide={handlePlayGuideAudio}
        onStopGuide={stopGuideAudio}
        showLetterCaseSwitch={false}
      />
      <View className="flex flex-1 flex-col bg-[#F2EFF0] pb-4">
        <View className="m-4 flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-purple-500 bg-white ">
          <View className="flex items-center justify-center pt-4">
            <View className="flex flex-row gap-4 rounded-full p-2">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    setIsAlphabeticPlaying(true);
                    await playSound(activeActivity.sound.alphabeticAudioSrc);
                    incrementProgress("ALPHABETIC_SOUND");
                  } catch (error) {
                    console.log("Error playing alphabetic sound:", error);
                  } finally {
                    setIsAlphabeticPlaying(false);
                  }
                }}
                className="z-50 flex size-[70] items-center justify-center rounded-full bg-colors-purple-500"
              >
                <NameButton {...buttonStyles} />
                <AnimatedBreathingView
                  isPlaying={isAlphabeticPlaying}
                  size={70}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    setIsPhoneticPlaying(true);
                    await playSound(activeActivity.sound.phoneticAudioSrc);
                    incrementProgress("PHONETIC_SOUND");
                  } catch (error) {
                    console.log("Error playing phonetic sound:", error);
                  } finally {
                    setIsPhoneticPlaying(false);
                  }
                }}
                className="z-50 flex size-[70] items-center justify-center rounded-full bg-colors-purple-500"
              >
                <EarButton {...buttonStyles} />
                <AnimatedBreathingView
                  isPlaying={isPhoneticPlaying}
                  size={70}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View
            className="flex flex-1 flex-col items-center justify-center"
            style={{ transform: [{ translateY: VERTICAL_OFFSET }] }}
          >
            <PageLinesSVG />
          </View>
          <AnimatedLetterComponent
            ref={animatedLetterRef}
            name={activeActivity.letter.lowerCase}
            key={activeActivity.letter.lowerCase}
            onAnimationComplete={onAnimationComplete}
            onAnimationStart={onAnimationStart}
            // isAnimating={isAnimating}
          />
          <View className="mt-auto flex flex-row items-center justify-evenly pb-6">
            <TouchableOpacity
              onPress={() => {
                animatedLetterRef?.current?.animateUppercase();
              }}
            >
              <PencilButton {...buttonStyles} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                animatedLetterRef?.current?.animateLowercase();
              }}
            >
              <PencilButton {...buttonStyles} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-auto flex w-full flex-col justify-between px-4">
          <View className="flex w-full flex-row items-center justify-around">
            {activitiesInCurrentSection.map((activity, index) => (
              <Pressable
                className={clsx("flex size-[60] justify-center  rounded-md  ", {
                  "bg-colors-gray-300": activity.id !== activeActivity.id,
                  "bg-colors-purple-500": activity.id === activeActivity.id,
                  // "bg-gray-200": isAnimating,
                })}
                onPress={() => {
                  /**
                   * update current activity
                   */
                  setActiveActivity(activity);
                }}
                key={index}
                // disabled={isAnimating}
              >
                <View className="flex flex-row items-center justify-center ">
                  <Text style={globalStyles.thomasFont}>
                    {activity.letter.upperCase}
                  </Text>
                  <Text style={globalStyles.thomasFont}>
                    {activity.letter.lowerCase}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LetterIntroduction;
