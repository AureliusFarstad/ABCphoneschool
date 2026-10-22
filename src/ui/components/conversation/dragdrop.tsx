import clsx from "clsx";
import type { AVPlaybackSource } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { State } from "react-native-gesture-handler";
import type { WithSpringConfig } from "react-native-reanimated";
import Animated, {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { DndProviderProps } from "rn-super-drag-drop";
import { DndProvider, Draggable, Droppable } from "rn-super-drag-drop";

import useSound from "@/core/hooks/useSound";
import { SmallEarIcon } from "@/ui/icons";
import { WIDTH } from "@/utils/layout";

const OFFSET_VALUES_FOR_INDICES: {
  [key: number]: "first" | "second" | "third";
} = {
  0: "first",
  1: "second",
  2: "third",
};

export const CustomBounceIn = () => {
  "worklet";
  const animations = {
    transform: [
      {
        scale: withSpring(1, {
          mass: 1,
          stiffness: 100,
          damping: 10,
          velocity: 0,
        }),
      },
    ],
    opacity: withSpring(1, {
      mass: 1,
      stiffness: 100,
      damping: 10,
      velocity: 0,
    }),
  };

  const initialValues = {
    transform: [{ scale: 0.3 }],
    opacity: 0,
  };

  return {
    initialValues,
    animations,
  };
};

type WordGameData = {
  options: {
    id: string;
    content: string;
    description: string;
  }[];
  correctAnswer: {
    word: string;
    alphabets: {
      id: string;
      content: string;
      description: string;
      audio: AVPlaybackSource;
    }[];
  };
};

type DragDropProps = {
  activeActivity: WordGameData;
};

type Item = {
  id: string;
  content: string;
  description: string;
};

export const DEFAULT_SPRING_CONFIG: WithSpringConfig = {
  damping: 10, // Defines how the spring’s motion should be damped due to the forces of friction. Default 10.
  mass: 1, // The mass of the object attached to the end of the spring. Default 1.
  stiffness: 100, // The spring stiffness coefficient. Default 100.
  overshootClamping: false, // Indicates whether the spring should be clamped and not bounce. Default false.
};

export const DragDrop = ({ activeActivity }: DragDropProps) => {
  const dynamicData = useSharedValue<{
    items: Item[];
    elements: {
      first: Item | null;
      second: Item | null;
      third: Item | null;
    };
  }>({
    items: activeActivity.options,
    elements: {
      first: null,
      second: null,
      third: null,
    },
  });

  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [, setCounter] = useState(0);
  const [isHintDisplayed, setIsHintDisplayed] = useState(false);
  const [isUndoInProgress, setIsUndoInProgress] = useState(false);

  const { playSound } = useSound();

  const undoTimeoutRef = useRef<number>(null);

  const updateCounter = useCallback(() => {
    setCounter((prev) => prev + 1);
  }, []);

  console.log({ isUndoInProgress });

  const onRemove = useCallback(
    (item: Item) => {
      "worklet";
      const updatedElements = dynamicData.value.elements;
      let updatedItems = dynamicData.value.items;
      if (updatedElements.first?.id === item.id) {
        updatedElements.first = null;
        updatedItems = [...dynamicData.value.items, item];
      } else if (updatedElements.second?.id === item.id) {
        updatedElements.second = null;
        updatedItems = [...dynamicData.value.items, item];
      } else if (updatedElements.third?.id === item.id) {
        updatedElements.third = null;
        updatedItems = [...dynamicData.value.items, item];
      }
      dynamicData.value = {
        items: updatedItems,
        elements: updatedElements,
      };
      runOnJS(updateCounter)();
      runOnJS(setIsUndoInProgress)(false);
    },
    [dynamicData, updateCounter],
  );

  const checkAndUndoIncorrectPlacement = useCallback(() => {
    const elements = dynamicData.value.elements;
    const correctWord = activeActivity.correctAnswer.word;

    let hasIncorrectPlacement = false;

    Object.entries(elements).forEach(([_key, element], index) => {
      if (element && element.content !== correctWord[index]) {
        hasIncorrectPlacement = true;
        setIsUndoInProgress(true);
        // Schedule undo after 1 second
        undoTimeoutRef.current = setTimeout(() => {
          onRemove(element);
        }, 1000);
      }
    });

    if (!hasIncorrectPlacement) {
      setIsUndoInProgress(false);
    }
  }, [dynamicData.value, activeActivity.correctAnswer.word, onRemove]);

  const handleDragEnd: DndProviderProps["onDragEnd"] = ({ active, over }) => {
    "worklet";
    if (over && !isUndoInProgress) {
      const draggedItem = dynamicData.value.items.find(
        (item) => item.id === active.id,
      );

      dynamicData.modify((value) => {
        if (
          !value.elements.first &&
          over.id.toString().includes("0") &&
          draggedItem
        ) {
          value.elements.first = draggedItem;
          value.items = value.items.filter((item) => item.id !== active.id);
        } else if (
          !value.elements.second &&
          over.id.toString().includes("1") &&
          draggedItem
        ) {
          value.elements.second = draggedItem;
          value.items = value.items.filter((item) => item.id !== active.id);
        } else if (
          !value.elements.third &&
          over.id.toString().includes("2") &&
          draggedItem
        ) {
          value.elements.third = draggedItem;
          value.items = value.items.filter((item) => item.id !== active.id);
        }
        return value;
      });
      runOnJS(updateCounter)();
      runOnJS(checkAndUndoIncorrectPlacement)();
    }
  };

  const handleBegin: DndProviderProps["onBegin"] = () => {
    "worklet";
    console.log("onBegin");
  };

  const handleFinalize: DndProviderProps["onFinalize"] = ({ state }) => {
    "worklet";
    if (state !== State.FAILED) {
      console.log("Drag operation completed successfully");
    }
  };

  const checkOrder = useCallback(() => {
    "worklet";
    const elements = dynamicData.value.elements;
    const currentAnswer =
      (elements.first?.content || "") +
      (elements.second?.content || "") +
      (elements.third?.content || "");

    const isCorrectAnswer = activeActivity.correctAnswer.word === currentAnswer;
    setIsCorrect(isCorrectAnswer);
  }, [dynamicData.value, activeActivity.correctAnswer.word]);

  const items = useDerivedValue(() => dynamicData.value.items, [dynamicData]);

  const onTapping = useCallback(
    (item: Item) => {
      "worklet";
      if (isUndoInProgress) return;

      const updatedElements = dynamicData.value.elements;
      let updatedItems = dynamicData.value.items;
      if (!updatedElements.first) {
        updatedElements.first = item;
        updatedItems = dynamicData.value.items.filter(
          (_item) => _item.id !== item.id,
        );
      } else if (!updatedElements.second) {
        updatedElements.second = item;
        updatedItems = dynamicData.value.items.filter(
          (_item) => _item.id !== item.id,
        );
      } else if (!updatedElements.third) {
        updatedElements.third = item;
        updatedItems = dynamicData.value.items.filter(
          (_item) => _item.id !== item.id,
        );
      }
      dynamicData.value = {
        items: updatedItems,
        elements: {
          ...updatedElements,
        },
      };
      runOnJS(updateCounter)();
      runOnJS(checkAndUndoIncorrectPlacement)();
    },
    [
      updateCounter,
      dynamicData,
      isUndoInProgress,
      checkAndUndoIncorrectPlacement,
    ],
  );

  useEffect(() => {
    checkOrder();
  }, [dynamicData.value, checkOrder]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  return (
    <DndProvider
      onDragEnd={handleDragEnd}
      onBegin={handleBegin}
      onFinalize={handleFinalize}
      style={{ height: 500, width: WIDTH }}
    >
      <View className="mb-10  flex px-4 ">
        {activeActivity.correctAnswer.alphabets.map((item, index) => {
          const offset: "first" | "second" | "third" =
            OFFSET_VALUES_FOR_INDICES[index];

          return (
            <Droppable key={item.id} id={item.id}>
              <Animated.View
                entering={
                  dynamicData.value.elements[offset]?.id
                    ? CustomBounceIn
                    : undefined
                }
                className={clsx(
                  "z-50 my-10 flex w-3/4 items-center justify-center rounded-full py-4  ",
                  {
                    "bg-[#8AC65B]": dynamicData.value.elements[offset]?.content,
                    "bg-[#F7D6DE] border-4 border-dashed border-[#F36889]":
                      !dynamicData.value.elements[offset]?.content,
                    "bg-red-500":
                      dynamicData.value.elements[offset] &&
                      dynamicData.value.elements[offset]?.content !==
                        item.content,
                    "ml-auto": index % 2 === 1,
                  },
                )}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (
                      dynamicData.value.elements[offset] &&
                      !isUndoInProgress
                    ) {
                      onRemove(dynamicData.value.elements[offset]);
                    } else if (!isHintDisplayed) {
                      playSound(item.audio);
                    }
                  }}
                  className="w-full items-center justify-center "
                >
                  {isHintDisplayed ? (
                    <Text className="text-3xl font-medium">
                      {dynamicData.value.elements[offset]?.description
                        ? dynamicData.value.elements[offset]?.description
                        : item.description}
                    </Text>
                  ) : (
                    <View>
                      {dynamicData.value.elements[offset]?.content ? (
                        <Text className="text-3xl font-medium">
                          {dynamicData.value.elements[offset]?.description}
                        </Text>
                      ) : (
                        <View className="flex flex-row items-center">
                          <SmallEarIcon />
                          <Text>{item.description}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Droppable>
          );
        })}

        {/* <TouchableOpacity
          className="ml-10 flex  size-[64] items-center justify-center "
          onPress={() => {
            setIsHintDisplayed(!isHintDisplayed);
          }}
        >
          <View className="size-10 items-center justify-center rounded-full bg-colors-green-500">
            {isHintDisplayed ? <EyeClosed /> : <EyeOpen />}
          </View>
        </TouchableOpacity> */}
      </View>

      {isCorrect ? (
        <Text>Done</Text>
      ) : (
        <Pressable onPress={checkOrder}>
          <Text>Check</Text>
        </Pressable>
      )}
      {!isHintDisplayed ? (
        <Pressable
          onPress={() => {
            setIsHintDisplayed(true);
          }}
        >
          <Text>Show hints</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            setIsHintDisplayed(false);
          }}
        >
          <Text>Hide hints</Text>
        </Pressable>
      )}

      <View className="z-50 mt-10 flex size-full flex-row flex-wrap justify-evenly gap-6 bg-[#F7D6DE] p-8 px-16">
        <>
          {items.value.map((item) => (
            <Draggable key={item.id} id={item.id} data={item}>
              <Pressable
                className={clsx(
                  "flex size-[60] items-center justify-center rounded-full bg-[#F36889]",
                  isUndoInProgress && "opacity-50",
                )}
                onPress={() => !isUndoInProgress && onTapping(item)}
                disabled={isUndoInProgress}
              >
                <Text className="text-3xl font-medium">{item.content}</Text>
              </Pressable>
            </Draggable>
          ))}
        </>
      </View>
    </DndProvider>
  );
};

export default DragDrop;
