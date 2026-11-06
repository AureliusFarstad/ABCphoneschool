import { router, useFocusEffect } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import * as React from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { APP_COLORS } from "@/constants/routes";
import LetterCaseSwitch from "@/ui/components/global-letter-casing-switch";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { EmptyHeadButton } from "@/ui/icons/circular/empty-head-button";
import { HomeButton } from "@/ui/icons/circular/home-button";

// TODO: Move out of file. Shared with home screen
const buttonColorProps: ButtonColorProps = {
  primaryColor: APP_COLORS.green,
  secondaryColor: APP_COLORS.lightgreen,
  offwhiteColor: APP_COLORS.offwhite,
  offblackColor: APP_COLORS.offblack,
  backgroundColor: APP_COLORS.backgroundgrey,
};

const SIZE = 50;

type AnimatedAudioButtonProps = {
  onPress: () => void;
  icon: ReactNode;
  isPlaying?: boolean;
  width?: number;
  height?: number;
  borderColor?: string;
  borderWidth?: number;
  breatheDuration?: number;
  className?: string;
  initialPulseColor?: string;
  isInitialPulseConditionMet?: boolean;
};

function AnimatedAudioButton({
  onPress,
  icon,
  isPlaying = false,
  width = 50,
  height = 50,
  borderColor = "#F69F4E",
  borderWidth = 3,
  breatheDuration = 1500,
  className,
  initialPulseColor,
  isInitialPulseConditionMet,
}: AnimatedAudioButtonProps) {
  const borderOpacity = useSharedValue(0);
  const borderScale = useSharedValue(1);
  const initialPulseOpacity = useSharedValue(0);

  const [hasBeenPressedAtLeastOnce, setHasBeenPressedAtLeastOnce] =
    React.useState(false);

  useEffect(() => {
    if (isPlaying) {
      cancelAnimation(initialPulseOpacity);
      initialPulseOpacity.value = withTiming(0, { duration: 100 });
      startBreathingAnimation();
    } else {
      stopBreathingAnimation();
      if (
        initialPulseColor &&
        isInitialPulseConditionMet &&
        !hasBeenPressedAtLeastOnce
      ) {
        startInitialPulseAnimation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPlaying,
    initialPulseColor,
    isInitialPulseConditionMet,
    hasBeenPressedAtLeastOnce,
  ]);

  useEffect(() => {
    if (
      initialPulseColor &&
      isInitialPulseConditionMet &&
      !hasBeenPressedAtLeastOnce &&
      !isPlaying
    ) {
      startInitialPulseAnimation();
    } else {
      stopInitialPulseAnimation();
    }
    // Stop initial pulse if component unmounts or conditions change
    return () => {
      stopInitialPulseAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialPulseColor,
    isInitialPulseConditionMet,
    hasBeenPressedAtLeastOnce,
    isPlaying,
  ]);

  useEffect(() => {
    return () => {
      cancelAnimation(borderOpacity);
      cancelAnimation(borderScale);
      cancelAnimation(initialPulseOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopBreathingAnimation = () => {
    cancelAnimation(borderOpacity);
    cancelAnimation(borderScale);
    borderOpacity.value = withTiming(0, { duration: 300 });
    borderScale.value = withTiming(1, { duration: 300 });
  };

  const startBreathingAnimation = () => {
    borderOpacity.value = withSequence(
      withTiming(0.8, { duration: breatheDuration / 2, easing: Easing.ease }),
      withRepeat(
        withSequence(
          withTiming(1, { duration: breatheDuration / 2, easing: Easing.ease }),
          withTiming(0.8, {
            duration: breatheDuration / 2,
            easing: Easing.ease,
          }),
        ),
        -1,
      ),
    );
    borderScale.value = withSequence(
      withTiming(1.1, { duration: breatheDuration / 2, easing: Easing.ease }),
      withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: breatheDuration / 2,
            easing: Easing.ease,
          }),
          withTiming(1.1, {
            duration: breatheDuration / 2,
            easing: Easing.ease,
          }),
        ),
        -1,
      ),
    );
  };

  const startInitialPulseAnimation = () => {
    initialPulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  };

  const stopInitialPulseAnimation = () => {
    cancelAnimation(initialPulseOpacity);
    initialPulseOpacity.value = withTiming(0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
    transform: [{ scale: borderScale.value }],
  }));

  const initialPulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: initialPulseOpacity.value,
  }));

  const handlePress = () => {
    if (!hasBeenPressedAtLeastOnce) {
      setHasBeenPressedAtLeastOnce(true);
      stopInitialPulseAnimation();
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.animatedButtonContainer]}
      onPress={handlePress}
      className={className}
    >
      {initialPulseColor &&
        isInitialPulseConditionMet &&
        !hasBeenPressedAtLeastOnce &&
        !isPlaying && (
          <Animated.View
            style={[
              styles.animatedBorder,
              {
                borderColor: initialPulseColor,
                borderWidth,
                width: width + borderWidth * 2,
                height: height + borderWidth * 2,
                borderRadius: (width + borderWidth * 2) / 2,
              },
              initialPulseAnimatedStyle,
            ]}
          />
        )}
      <Animated.View
        style={[
          styles.animatedBorder,
          {
            borderColor,
            borderWidth,
            width: width + borderWidth * 2,
            height: height + borderWidth * 2,
            borderRadius: (width + borderWidth * 2) / 2,
          },
          animatedStyle,
        ]}
      />
      <View
        style={[
          styles.animatedButton,
          { width, height, borderRadius: width / 2 },
        ]}
      >
        {icon}
      </View>
    </TouchableOpacity>
  );
}

type HeaderProps = {
  title: string;
  onPressGuide?: () => void;
  onStopGuide?: () => void;
  isPlaying: boolean;
  showLetterCaseSwitch?: boolean;
  // Hide for screens that don't have guidance audio yet
  showGuidanceButton?: boolean;
  initialPulseColorForGuidance?: string;
  activateInitialGuidancePulse?: boolean;
};

const GuidanceAudioHeader = ({
  title,
  onPressGuide,
  onStopGuide,
  isPlaying,
  showLetterCaseSwitch = true,
  showGuidanceButton = true,
  initialPulseColorForGuidance,
  activateInitialGuidancePulse,
}: HeaderProps) => {
  const navigateToHome = useCallback(() => {
    router.dismissTo("/");
  }, []);

  console.log(title);

  useFocusEffect(
    useCallback(() => {
      // Effect runs when screen comes into focus
      return () => {
        // Cleanup runs when screen loses focus or onStopGuide changes
        if (onStopGuide) {
          onStopGuide();
        }
      };
    }, [onStopGuide]), // Dependency: only onStopGuide
  );

  return (
    <View
      className="flex-row items-center justify-between px-4 py-2"
      style={{
        backgroundColor: APP_COLORS.offwhite,
      }}
    >
      <View className="flex-row items-center space-x-4">
        <Pressable onPress={navigateToHome} className="p-2">
          <View style={[{ width: SIZE, height: SIZE }]}>
            <HomeButton {...buttonColorProps} />
          </View>
        </Pressable>
      </View>
      <View className="flex-row items-center space-x-4">
        {showLetterCaseSwitch && <LetterCaseSwitch />}
      </View>
      <View className="flex-row items-center space-x-4">
        {showGuidanceButton ? (
          <AnimatedAudioButton
            className="p-2"
            onPress={onPressGuide || (() => {})}
            isPlaying={isPlaying}
            width={SIZE}
            height={SIZE}
            borderColor={APP_COLORS.green}
            icon={
              <View style={{ width: SIZE, height: SIZE }}>
                <EmptyHeadButton {...buttonColorProps} />
              </View>
            }
            initialPulseColor={initialPulseColorForGuidance}
            isInitialPulseConditionMet={activateInitialGuidancePulse}
          />
        ) : (
          // Same footprint as the button, so the case switch stays centered
          <View className="p-2">
            <View style={{ width: SIZE, height: SIZE }} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  animatedButtonContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  animatedBorder: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  animatedButton: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});

export default GuidanceAudioHeader;
