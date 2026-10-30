import type { AudioPlayer, AudioSource } from "expo-audio";
import { createAudioPlayer } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { audioStoreActions, releasePlayer } from "@/core/store/audio";

type AnimatedAudioButtonProps = {
  width?: number;
  height?: number;
  audioSource: AudioSource | string;
  children: React.ReactNode;
  borderColor?: string;
  borderWidth?: number;
  breatheDuration?: number;
  onPress?: () => void;
  disabled?: boolean;
};

export const AnimatedAudioButton = ({
  width = 40,
  height = 40,
  audioSource,
  children,
  borderColor = "#4CAF50",
  borderWidth = 4,
  breatheDuration = 2000,
  onPress,
  disabled,
}: AnimatedAudioButtonProps) => {
  const [sound, setSound] = React.useState<AudioPlayer>();
  const [isPlaying, setIsPlaying] = React.useState(false);

  const borderOpacity = useSharedValue(0);

  // Keep screen awake while audio is playing
  React.useEffect(() => {
    if (isPlaying) {
      activateKeepAwakeAsync("animated-audio-button");
    } else {
      deactivateKeepAwake("animated-audio-button");
    }

    return () => {
      deactivateKeepAwake("animated-audio-button");
    };
  }, [isPlaying]);

  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      if (sound) {
        try {
          releasePlayer(sound);
        } catch (e) {
          // Ignore error if sound is already unloaded or not loaded
        }
      }
    };
  }, [sound]);

  const stopAnimation = () => {
    setIsPlaying(false);
    cancelAnimation(borderOpacity);
    borderOpacity.value = withTiming(0, { duration: 500 });
  };

  const startBreathingAnimation = () => {
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
  };

  const playSound = async () => {
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

      setIsPlaying(true);
      startBreathingAnimation();

      const source =
        typeof audioSource === "string" && audioSource.includes("mp3")
          ? { uri: audioSource }
          : audioSource;

      const newSound = createAudioPlayer(source);
      newSound.play();
      setSound(newSound);

      newSound.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          stopAnimation();
          audioStoreActions.clearCurrentSound();
          return;
        }

        // Status updates arrive before the sound has loaded; ignore those
        if (!status.isLoaded) {
          return;
        }

        if (!status.playing && isPlaying) {
          stopAnimation();
        }
      });

      // Register with global audio store; stop animating if another sound stops this one
      await audioStoreActions.registerSound(newSound, stopAnimation);

      onPress?.();
    } catch (error) {
      console.error("Error playing sound:", error);
      stopAnimation();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <TouchableOpacity onPress={playSound} disabled={disabled}>
      <View style={[styles.container]}>
        <Animated.View
          style={[
            styles.border,
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
        {children}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  border: {
    position: "absolute",
    borderStyle: "solid",
  },
  button: {
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 999,
  },
});
