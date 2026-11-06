import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALPHABET_LETTERS } from "@/assets/alphabet";
import { ALPHABET_AUDIO_SOURCES } from "@/assets/alphabet/alphabet_sounds";
import { APP_COLORS, SECTION_COLORS } from "@/constants/routes";
import { SafeAreaView, View } from "@/ui";
import AnimatedLetterComponent from "@/ui/components/home/animated-letter-component";
import { PageLinesSVG } from "@/ui/components/page-lines";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { AnimatedAudioButton } from "@/ui/icons/animated-audio-button-wrapper";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EarButton } from "@/ui/icons/circular/ear-button";
import { NameButton } from "@/ui/icons/circular/name-button";
import { PencilButton } from "@/ui/icons/circular/pencil-button";
import { globalStyles } from "@/ui/styles";

type AnimatedLetterComponentRef = {
  animateLowercase: () => void;
  animateUppercase: () => void;
};

// Layout matches letter-introduction, so the letters sit on the page lines
const VERTICAL_OFFSET = -9;
const AUDIO_BUTTON_SIZE = 70;

const buttonStyles: ButtonColorProps = {
  primaryColor: SECTION_COLORS.alphabet.primary,
  secondaryColor: SECTION_COLORS.alphabet.dark,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const LetterScreen = () => {
  const { letter } = useLocalSearchParams<{ letter: string }>();
  const { bottom: safeAreaBottomInset } = useSafeAreaInsets();
  const animatedLetterRef = useRef<AnimatedLetterComponentRef | null>(null);

  if (!ALPHABET_LETTERS.includes(letter)) {
    return <Redirect href="/letters" />;
  }

  const audioSources = ALPHABET_AUDIO_SOURCES[letter];

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "left", "right"]}
    >
      <GuidanceAudioHeader
        title="Letter"
        isPlaying={false}
        showLetterCaseSwitch={false}
        showGuidanceButton={false}
      />
      <View
        className="flex flex-1 flex-col bg-[#F2EFF0]"
        style={{ paddingBottom: safeAreaBottomInset }}
      >
        <View className="m-4 flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-purple-500 bg-white ">
          <View className="flex items-center justify-center pt-4">
            <View className="flex flex-row gap-4 rounded-full p-2">
              <AnimatedAudioButton
                audioSource={audioSources.name}
                width={AUDIO_BUTTON_SIZE}
                height={AUDIO_BUTTON_SIZE}
              >
                <View className="flex size-[70] items-center justify-center rounded-full bg-colors-purple-500">
                  <NameButton {...buttonStyles} />
                </View>
              </AnimatedAudioButton>
              <AnimatedAudioButton
                audioSource={audioSources.sound}
                width={AUDIO_BUTTON_SIZE}
                height={AUDIO_BUTTON_SIZE}
              >
                <View className="flex size-[70] items-center justify-center rounded-full bg-colors-purple-500">
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
            name={letter}
            key={letter}
            onAnimationComplete={() => {}}
            onAnimationStart={() => {}}
          />
          <View className="mt-auto flex flex-row items-center justify-evenly pb-6">
            <TouchableOpacity
              onPress={() => {
                animatedLetterRef.current?.animateUppercase();
              }}
            >
              <PencilButton {...buttonStyles} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                animatedLetterRef.current?.animateLowercase();
              }}
            >
              <PencilButton {...buttonStyles} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LetterScreen;
