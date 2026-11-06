import { router } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALPHABET_LETTERS } from "@/assets/alphabet";
import { Pressable, SafeAreaView, ScrollView, View } from "@/ui";
import { LetterTile } from "@/ui/components/letter-tile";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import { useLetterCase } from "@/ui/core/headers/letter-case-context";
import { globalStyles } from "@/ui/styles";
import { WIDTH } from "@/utils/layout";

const COLUMNS = 5;
const GRID_PADDING = 16;
const GAP = 12;
const TILE_SIZE = Math.floor(
  (WIDTH - GRID_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
);

const Letters = () => {
  const { isLowercase } = useLetterCase();
  const { bottom: safeAreaBottomInset } = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={globalStyles.safeAreaView}
      edges={["top", "left", "right"]}
    >
      <GuidanceAudioHeader
        title="Letters"
        isPlaying={false}
        showGuidanceButton={false}
      />
      <ScrollView
        className="flex-1 bg-[#F2EFF0]"
        contentContainerStyle={{
          padding: GRID_PADDING,
          paddingBottom: GRID_PADDING + safeAreaBottomInset,
        }}
      >
        <View className="flex-row flex-wrap" style={{ gap: GAP }}>
          {ALPHABET_LETTERS.map((letter) => (
            <Pressable
              key={letter}
              accessibilityRole="button"
              accessibilityLabel={letter}
              onPress={() => {
                router.push({
                  pathname: "/letters/[letter]",
                  params: { letter },
                });
              }}
            >
              {({ pressed }) => (
                <LetterTile
                  label={isLowercase ? letter : letter.toUpperCase()}
                  size={TILE_SIZE}
                  isActive={pressed}
                />
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Letters;
