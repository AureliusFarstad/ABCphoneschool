import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import Svg, { Line } from "react-native-svg";

import { APP_COLORS } from "@/constants/routes";
import { MS_300 } from "@/constants/timing";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import { audioStoreActions } from "@/core/store/audio";
import { useLevelStore } from "@/core/store/levels";
import { Pressable, SafeAreaView, Text, View } from "@/ui";
import AnimatedLetterComponent from "@/ui/components/home/animated-letter-component";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { AnimatedAudioButton } from "@/ui/icons/animated-audio-button-wrapper";
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

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "left", "right"]}
    >
      <GuidanceAudioHeader
        title="Letter Introduction"
        isPlaying={isPlaying}
        onPressGuide={playGuideAudio}
        onStopGuide={stopGuideAudio}
        showLetterCaseSwitch={false}
      />
      <View className="flex flex-1 flex-col bg-[#F2EFF0] pb-4">
        <View className="m-4 flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-purple-500 bg-white ">
          {/* z-50 keeps the audio buttons above AnimatedLetterComponent's full-card overlay */}
          <View className="z-50 flex items-center justify-center pt-4">
            <View className="flex flex-row gap-4 rounded-full p-2">
              <AnimatedAudioButton
                audioSource={activeActivity.sound.alphabeticAudioSrc}
                width={70}
                height={70}
                onPress={() => incrementProgress("ALPHABETIC_SOUND")}
              >
                <View className="size-[70] items-center justify-center rounded-full bg-colors-purple-500">
                  <NameButton {...buttonStyles} />
                </View>
              </AnimatedAudioButton>
              <AnimatedAudioButton
                audioSource={activeActivity.sound.phoneticAudioSrc}
                width={70}
                height={70}
                onPress={() => incrementProgress("PHONETIC_SOUND")}
              >
                <View className="size-[70] items-center justify-center rounded-full bg-colors-purple-500">
                  <EarButton {...buttonStyles} />
                </View>
              </AnimatedAudioButton>
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
                  // The audio buttons don't stop when their source changes
                  audioStoreActions.stopAllAudio();
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
