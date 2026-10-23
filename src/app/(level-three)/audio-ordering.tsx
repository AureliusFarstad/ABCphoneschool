import type { RefObject } from "react";
import React, { useRef, useState } from "react";
import type { ViewInstance } from "react-native";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ALPHABET_AUDIO_SOURCES } from "@/assets/alphabet/alphabet_sounds";
import {
  requireEnglishConversationAudio,
  requireNativeConversationAudio,
} from "@/assets/conversation";
import { APP_COLORS, SECTION_COLORS } from "@/constants/routes";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import type {
  DestinationComponentType,
  GameSet,
} from "@/ui/components/audio-multiple-choice-component";
import AudioMultipleChoice from "@/ui/components/audio-multiple-choice-component";
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

const styles = StyleSheet.create({
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
  speakerCard: {
    height: 120,
    width: 220,
    borderWidth: 2,
    borderRadius: 12,
    margin: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: APP_COLORS.offwhite,
  },
  femaleSpeakerCard: {
    borderColor: primaryColor.primary,
  },
  maleSpeakerCard: {
    borderColor: secondaryColor.primary,
  },
  button: {
    width: 80,
    height: 80,
  },
  activeSpeakerCard: {
    backgroundColor: primaryColor.light,
  },
  dropCircle: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 40,
    borderStyle: "dashed",
    borderWidth: 2,
    backgroundColor: primaryColor.light,
  },
  overflowContainer: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    flexDirection: "column",
  },
  bottomAnchoredContent: {
    position: "absolute",
    flexDirection: "column",
    bottom: 0,
    left: 0,
    right: 0,
  },
  playButtonArea: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  playButtonWrapper: {},
  completedViewContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.backgroundgrey,
  },
});

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

const activePlayButtonColorProps: ButtonColorProps = {
  primaryColor: SECTION_COLORS.speaking.primary,
  secondaryColor: APP_COLORS.lightgreen,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const draggableButtonColorsConfig: ButtonColorProps[] = [
  {
    primaryColor: "#FFABDE",
    offwhiteColor: "#FAFAFA",
    offblackColor: "#3F3F46",
    secondaryColor: "#D282AE",
    backgroundColor: "#FFF0F6",
  },
  {
    primaryColor: SECTION_COLORS.alphabet.primary,
    secondaryColor: SECTION_COLORS.alphabet.dark,
    backgroundColor: SECTION_COLORS.alphabet.light,
    offwhiteColor: APP_COLORS.offwhite,
    offblackColor: APP_COLORS.offblack,
  },
  {
    primaryColor: SECTION_COLORS.blending.primary,
    secondaryColor: SECTION_COLORS.blending.dark,
    backgroundColor: SECTION_COLORS.blending.light,
    offwhiteColor: APP_COLORS.offwhite,
    offblackColor: APP_COLORS.offblack,
  },
];

const customAudioChoiceColors = {
  primary: SECTION_COLORS.speaking.primary,
  secondary: SECTION_COLORS.vocabulary.primary,
  tertiary: SECTION_COLORS.blending.primary,
  light: SECTION_COLORS.speaking.light,
  dark: SECTION_COLORS.speaking.dark,
};

interface DestinationCardFactoryProps {
  gender: "female" | "male";
  nativeAudioFile: string;
}

interface CompletedCardProps {
  gender: "female" | "male";
  englishAudioFile: string;
  nativeAudioFile: string;
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

const CompletedCard: React.FC<CompletedCardProps> = ({
  gender = "male",
  englishAudioFile,
  nativeAudioFile,
}) => {
  return (
    <View
      style={[
        styles.chatRow,
        gender === "female" ? styles.femaleChatRow : styles.maleChatRow,
      ]}
    >
      {gender === "female" && (
        <View style={styles.avatarWrapper}>
          <UserAvatar gender="f" name="a" />
        </View>
      )}
      <View
        style={[
          styles.speakerCard,
          gender === "female"
            ? styles.femaleSpeakerCard
            : styles.maleSpeakerCard,
        ]}
      >
        <AnimatedAudioButton
          audioSource={nativeAudioFile}
          width={80}
          height={80}
        >
          <View style={styles.button}>
            <NativeButton
              {...(gender === "female" ? femaleButtonProps : maleButtonProps)}
              width={80}
              height={80}
            />
          </View>
        </AnimatedAudioButton>
        <AnimatedAudioButton
          audioSource={englishAudioFile}
          width={80}
          height={80}
        >
          <View style={styles.button}>
            <EnglishButton
              {...(gender === "female" ? femaleButtonProps : maleButtonProps)}
            />
          </View>
        </AnimatedAudioButton>
      </View>
      {gender === "male" && (
        <View style={styles.avatarWrapper}>
          <UserAvatar gender="m" name="b" />
        </View>
      )}
    </View>
  );
};

const createConversationDestinationComponent: DestinationFunction<
  DestinationCardFactoryProps
> = ({ gender = "male", nativeAudioFile = ALPHABET_AUDIO_SOURCES.a.sound }) => {
  return (
    isCardActive: boolean,
  ): [
    DestinationComponentType,
    RefObject<ViewInstance | null>,
    RefObject<ViewInstance | null>,
  ] => {
    const dropCircleRef = useRef<ViewInstance>(null);
    const destinationContainerRef = useRef<ViewInstance>(null);

    const SpeakerCard = () => (
      <View
        style={[
          styles.chatRow,
          gender === "female" ? styles.femaleChatRow : styles.maleChatRow,
        ]}
      >
        {gender === "female" && (
          <View style={styles.avatarWrapper}>
            <UserAvatar gender="f" name="a" />
          </View>
        )}
        <View
          ref={destinationContainerRef}
          style={[
            styles.speakerCard,
            gender === "female"
              ? styles.femaleSpeakerCard
              : styles.maleSpeakerCard,
            isCardActive && styles.activeSpeakerCard,
          ]}
        >
          <AnimatedAudioButton
            audioSource={nativeAudioFile}
            width={80}
            height={80}
          >
            <View style={styles.button}>
              <NativeButton
                {...(gender === "female" ? femaleButtonProps : maleButtonProps)}
                width={80}
                height={80}
              />
            </View>
          </AnimatedAudioButton>
          <View
            ref={dropCircleRef}
            style={[
              styles.dropCircle,
              {
                borderColor:
                  gender === "female"
                    ? primaryColor.primary
                    : secondaryColor.primary,
                backgroundColor:
                  gender === "female"
                    ? primaryColor.light
                    : secondaryColor.light,
              },
            ]}
          />
        </View>
        {gender === "male" && (
          <View style={styles.avatarWrapper}>
            <UserAvatar gender="m" name="b" />
          </View>
        )}
      </View>
    );
    return [SpeakerCard, dropCircleRef, destinationContainerRef];
  };
};

const Screen = () => {
  const [dialogueCounter, setDialogueCounter] = useState(0);
  const insets = useSafeAreaInsets();

  const onCorrectAnswer = () => {
    setDialogueCounter((prevCounter) => prevCounter + 1);
  };

  const restartGame = () => {
    setDialogueCounter(0);
  };

  const renderInProgressContent = () => {
    switch (dialogueCounter) {
      case 0:
        const FirstConversationDestinationComponent =
          createConversationDestinationComponent({
            gender: "female",
            nativeAudioFile: requireNativeConversationAudio("part1", "female"),
          });
        const firstGameSet: GameSet = {
          correctAnswerId: "part1",
          options: [
            {
              id: "part1",
              audioFile: requireEnglishConversationAudio("part1", "female"),
            },
            {
              id: "part4",
              audioFile: requireEnglishConversationAudio("part4", "female"),
            },
            {
              id: "part3",
              audioFile: requireEnglishConversationAudio("part3", "female"),
            },
          ],
        };
        return (
          <AudioMultipleChoice
            useDestinationComponent={FirstConversationDestinationComponent}
            gameSet={firstGameSet}
            onCorrectAnswer={onCorrectAnswer}
            sectionColorTheme={customAudioChoiceColors}
            buttonColors={draggableButtonColorsConfig}
          />
        );
      case 1:
        const SecondConversationDestinationComponent =
          createConversationDestinationComponent({
            gender: "male",
            nativeAudioFile: requireNativeConversationAudio("part2", "male"),
          });
        const secondGameSet: GameSet = {
          correctAnswerId: "part2",
          options: [
            {
              id: "part2",
              audioFile: requireEnglishConversationAudio("part2", "male"),
            },
            {
              id: "part1",
              audioFile: requireEnglishConversationAudio("part1", "male"),
            },
            {
              id: "part4",
              audioFile: requireEnglishConversationAudio("part4", "male"),
            },
          ],
        };
        return (
          <View style={{ flex: 1 }}>
            <CompletedCard
              gender="female"
              englishAudioFile={requireEnglishConversationAudio(
                "part1",
                "female",
              )}
              nativeAudioFile={requireNativeConversationAudio(
                "part1",
                "female",
              )}
            />
            <AudioMultipleChoice
              useDestinationComponent={SecondConversationDestinationComponent}
              gameSet={secondGameSet}
              onCorrectAnswer={onCorrectAnswer}
              sectionColorTheme={customAudioChoiceColors}
              buttonColors={draggableButtonColorsConfig}
            />
          </View>
        );
      case 2:
        const ThirdConversationDestinationComponent =
          createConversationDestinationComponent({
            gender: "female",
            nativeAudioFile: requireNativeConversationAudio("part3", "female"),
          });
        const thirdGameSet: GameSet = {
          correctAnswerId: "part3",
          options: [
            {
              id: "part3",
              audioFile: requireEnglishConversationAudio("part3", "female"),
            },
            {
              id: "part1",
              audioFile: requireEnglishConversationAudio("part1", "female"),
            },
            {
              id: "part4",
              audioFile: requireEnglishConversationAudio("part4", "female"),
            },
          ],
        };
        return (
          <View style={{ flex: 1 }}>
            <CompletedCard
              gender="female"
              englishAudioFile={requireEnglishConversationAudio(
                "part1",
                "female",
              )}
              nativeAudioFile={requireNativeConversationAudio(
                "part1",
                "female",
              )}
            />
            <CompletedCard
              gender="male"
              englishAudioFile={requireEnglishConversationAudio(
                "part2",
                "male",
              )}
              nativeAudioFile={requireNativeConversationAudio("part2", "male")}
            />
            <AudioMultipleChoice
              useDestinationComponent={ThirdConversationDestinationComponent}
              gameSet={thirdGameSet}
              onCorrectAnswer={onCorrectAnswer}
              sectionColorTheme={customAudioChoiceColors}
              buttonColors={draggableButtonColorsConfig}
            />
          </View>
        );
      case 3:
        const FourthConversationDestinationComponent =
          createConversationDestinationComponent({
            gender: "male",
            nativeAudioFile: requireNativeConversationAudio("part4", "male"),
          });
        const forthGameSet: GameSet = {
          correctAnswerId: "part4",
          options: [
            {
              id: "part4",
              audioFile: requireEnglishConversationAudio("part4", "male"),
            },
            {
              id: "part1",
              audioFile: requireEnglishConversationAudio("part1", "male"),
            },
            {
              id: "part3",
              audioFile: requireEnglishConversationAudio("part3", "male"),
            },
          ],
        };
        return (
          <View style={{ flex: 1 }}>
            <CompletedCard
              gender="female"
              englishAudioFile={requireEnglishConversationAudio(
                "part1",
                "female",
              )}
              nativeAudioFile={requireNativeConversationAudio(
                "part1",
                "female",
              )}
            />
            <CompletedCard
              gender="male"
              englishAudioFile={requireEnglishConversationAudio(
                "part2",
                "male",
              )}
              nativeAudioFile={requireNativeConversationAudio("part2", "male")}
            />
            <CompletedCard
              gender="female"
              englishAudioFile={requireEnglishConversationAudio(
                "part3",
                "female",
              )}
              nativeAudioFile={requireNativeConversationAudio(
                "part3",
                "female",
              )}
            />
            <AudioMultipleChoice
              useDestinationComponent={FourthConversationDestinationComponent}
              gameSet={forthGameSet}
              onCorrectAnswer={onCorrectAnswer}
              sectionColorTheme={customAudioChoiceColors}
              buttonColors={draggableButtonColorsConfig}
            />
          </View>
        );
      default:
        return null;
    }
  };

  const {
    playGuideAudio,
    stopGuideAudio,
    isPlaying: isPlayingGuidanceAudio,
  } = useGuideAudio({
    screenName: "audio-ordering-tab",
    module: "conversation-module",
  });

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "right", "left"]}
    >
      <View style={{ flex: 1, backgroundColor: APP_COLORS.backgroundgrey }}>
        <GuidanceAudioHeader
          title="Sound"
          isPlaying={isPlayingGuidanceAudio}
          onStopGuide={stopGuideAudio}
          onPressGuide={playGuideAudio}
          showLetterCaseSwitch={false}
        />

        {dialogueCounter >= 4 ? (
          <View style={styles.completedViewContainer}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
              <View style={styles.playButtonArea}>
                <TouchableOpacity
                  onPress={restartGame}
                  style={styles.playButtonWrapper}
                >
                  <PlayButton
                    width={80}
                    height={80}
                    {...activePlayButtonColorProps}
                  />
                </TouchableOpacity>
              </View>
              <CompletedCard
                gender="female"
                englishAudioFile={requireEnglishConversationAudio(
                  "part1",
                  "female",
                )}
                nativeAudioFile={requireNativeConversationAudio(
                  "part1",
                  "female",
                )}
              />
              <CompletedCard
                gender="male"
                englishAudioFile={requireEnglishConversationAudio(
                  "part2",
                  "male",
                )}
                nativeAudioFile={requireNativeConversationAudio(
                  "part2",
                  "male",
                )}
              />
              <CompletedCard
                gender="female"
                englishAudioFile={requireEnglishConversationAudio(
                  "part3",
                  "female",
                )}
                nativeAudioFile={requireNativeConversationAudio(
                  "part3",
                  "female",
                )}
              />
              <CompletedCard
                gender="male"
                englishAudioFile={requireEnglishConversationAudio(
                  "part4",
                  "male",
                )}
                nativeAudioFile={requireNativeConversationAudio(
                  "part4",
                  "male",
                )}
              />
            </ScrollView>
          </View>
        ) : (
          <View style={styles.overflowContainer}>
            <View style={styles.bottomAnchoredContent}>
              {renderInProgressContent()}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Screen;
