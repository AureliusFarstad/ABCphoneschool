import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requireHomeScreenAudioByScreenName } from "@/assets/guidance-audio/audio-sources";
import WELCOME_VIDEO_BANNER from "@/assets/home/svg/welcome-video.svg";
import { APP_COLORS, LESSONS } from "@/constants/routes";
import { useUser } from "@/core/store/user";
import LanguageSelectionScreen from "@/ui/components/language-select-screen";
import { CheckIcon } from "@/ui/icons";
import { AnimatedAudioButton } from "@/ui/icons/animated-audio-button-wrapper";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EmptyHeadButton } from "@/ui/icons/circular/empty-head-button";
import { WIDTH } from "@/utils/layout";

// Welcome Video Banner Styling
const HORIZONTAL_PADDING = 20;
const WELCOME_WIDTH = WIDTH - HORIZONTAL_PADDING * 2;
const WELCOME_ASPECT_RATIO = 161 / 281; // Original height/width ratio
const WELCOME_HEIGHT = WELCOME_WIDTH * WELCOME_ASPECT_RATIO;

// Level Banner Styling
const BUTTON_WIDTH = 50;
const BUTTON_MARGIN_OUTSIDE = 20;
const BUTTON_MARGIN_INSIDE = 10;
const LEVEL_WIDTH =
  WIDTH - (BUTTON_WIDTH + BUTTON_MARGIN_OUTSIDE + BUTTON_MARGIN_INSIDE) * 2;
const LEVEL_ASPECT_RATIO = 118 / 164;
const LEVEL_HEIGHT = LEVEL_WIDTH * LEVEL_ASPECT_RATIO;

// TODO: Move out of file. Shared with header.
const buttonColorProps: ButtonColorProps = {
  primaryColor: APP_COLORS.green,
  secondaryColor: APP_COLORS.lightgreen,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const HomeHeader = () => {
  const { setLanguage } = useUser();

  return (
    <View>
      <Pressable
        onPress={() => {
          setLanguage("DEFAULT");
        }}
      >
        <View style={{ paddingLeft: 25 }}>
          <Image
            source={require("@/assets/home/png/return-to-select.png")} // Replace with your image path
            style={{ width: 98 * 1.8, height: 54 * 1.8 }} // Add dimensions
            resizeMode="contain" // Optional: adjust how image scales
          />
        </View>
      </Pressable>
      <Pressable
        onPress={() => {
          router.push("/(videos)/welcome");
        }}
      >
        <View style={homeStyles.welcomeVideoBannerContainer}>
          <WELCOME_VIDEO_BANNER style={homeStyles.welcomeVideoBanner} />
        </View>
        <View
          className="mb-10 bg-colors-green-500"
          style={homeStyles.levelBanner}
        >
          {/* add hidden to hide */}
          <Text className="py-2 text-center text-4xl text-white">1</Text>
        </View>
      </Pressable>
    </View>
  );
};

const Separator = () => <View className="my-8" />;

const homeStyles = StyleSheet.create({
  welcomeVideoBannerContainer: {
    width: "100%",
    alignContent: "center",
    justifyContent: "center",
    padding: HORIZONTAL_PADDING,
  },
  welcomeVideoBanner: {
    height: WELCOME_HEIGHT,
  },
  levelBanner: {
    backgroundColor: APP_COLORS.green,
  },
  speakerButtonStyle: {
    width: BUTTON_WIDTH,
    height: BUTTON_WIDTH,
    marginLeft: BUTTON_MARGIN_OUTSIDE,
    marginRight: BUTTON_MARGIN_INSIDE,
  },
  checkButtonStyle: {
    width: BUTTON_WIDTH,
    height: BUTTON_WIDTH,
    marginLeft: BUTTON_MARGIN_INSIDE,
    marginRight: BUTTON_MARGIN_OUTSIDE,
  },
});

const Home = () => {
  const { language, addCompletedLevel, levelsCompleted, removeCompletedLevel } =
    useUser();

  // Show language selection if no language is selected
  if (language === "DEFAULT") {
    return <LanguageSelectionScreen />;
  }

  // TODO solve ERROR:
  // Warning: Text strings must be rendered within a <Text> component.
  // Happening because of svg items...

  const renderItem = ({ item }: { item: ILesson }) => {
    const currentFill = levelsCompleted.includes(item.id)
      ? "#62CC82"
      : "#D4D4D8";
    return (
      <View className="flex flex-row items-start">
        {/* Guidance Audio Button */}
        <View style={homeStyles.speakerButtonStyle}>
          <AnimatedAudioButton
            audioSource={requireHomeScreenAudioByScreenName(
              item.guidanceAudioKey,
            )}
            width={BUTTON_WIDTH}
            height={BUTTON_WIDTH}
          >
            <EmptyHeadButton {...buttonColorProps} />
          </AnimatedAudioButton>
        </View>
        {/* Lesson Banner */}
        <Pressable
          onPress={() => {
            router.push(item.path as never);
          }}
        >
          <item.svg width={LEVEL_WIDTH} height={LEVEL_HEIGHT} />
        </Pressable>
        {/* Toggleable Checkmark */}
        <Pressable
          onPress={() => {
            // Toggle the checked state for this specific item
            if (levelsCompleted.includes(item.id)) {
              removeCompletedLevel(item.id);
            } else {
              addCompletedLevel(item.id);
            }
          }}
        >
          <View style={homeStyles.checkButtonStyle}>
            <CheckIcon
              width={BUTTON_WIDTH}
              height={BUTTON_WIDTH}
              fill={currentFill}
            />
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View>
        <FlatList
          ListHeaderComponent={HomeHeader}
          data={LESSONS}
          renderItem={renderItem}
          keyExtractor={(_) => _.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ paddingVertical: 30 }}
        />
      </View>
    </SafeAreaView>
  );
};

export default Home;
