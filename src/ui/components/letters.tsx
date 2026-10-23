import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ViewInstance } from "react-native";
import { Alert, PanResponder, View } from "react-native";
import Svg, { Path as SvgPath } from "react-native-svg";

import { SafeAreaView, Text, TouchableOpacity } from "@/ui";

type Path = {
  pathString: string;
  startingPoint: { x1: number; y1: number };
  endingPoint: { x2: number; y2: number };
};

/**
 * Shuffle letters
 */

export const shuffleLetters = (letters: string[]) => {
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
};

interface ILetter {
  id: string;
  value: string;
}

const LetterTapMatching = () => {
  // const dynamicModalRef = useRef<DynamicModalRefType>(null);

  const [leftLetters, setLeftLetters] = useState<ILetter[]>([]);
  const [rightLetters, setRightLetters] = useState<ILetter[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<ILetter | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);

  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const pathRef = useRef<string>("");
  const startPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const layoutValuesRef = useRef<
    {
      x: number;
      y: number;
      id: string;
      value: string;
    }[]
  >([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        startPointRef.current = { x: locationX, y: locationY };
        pathRef.current = `M${locationX},${locationY}`;
        setCurrentPath(`M${locationX},${locationY} L${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `M${startPointRef.current.x},${startPointRef.current.y} L${locationX},${locationY}`;
        pathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;

        const newPath: Path = {
          pathString: `M${startPointRef.current.x},${startPointRef.current.y} L${locationX},${locationY}`,
          startingPoint: {
            x1: Math.floor(startPointRef.current.x),
            y1: Math.floor(startPointRef.current.y),
          },
          endingPoint: {
            x2: Math.floor(locationX),
            y2: Math.floor(locationY),
          },
        };
        /**
         * Calculate the two letters
         * left value
         * right value
         */
        const letterFoundInLeft = checkLeftLetterValue({
          y1: Math.floor(startPointRef.current.y),
        });
        const letterFoundInRight = checkRightLetterValue({
          y1: locationY,
        });
        /**
         * Update the paths
         */
        checkIfLettersMatch(letterFoundInLeft, letterFoundInRight, newPath);
        setCurrentPath("");
      },
    }),
  ).current;

  const checkIfLettersMatch = (
    letterFoundInLeft: string,
    letterFoundInRight: string,
    newPath: Path,
  ) => {
    if (letterFoundInLeft === letterFoundInRight) {
      setPaths((prevPaths) => [...prevPaths, newPath]);
      setMatchedPairs((prev) => [...prev, letterFoundInRight]);
    }
  };

  const initializeGame = useCallback(() => {
    const letters = shuffleLetters(["s", "n", "i", "t", "p", "a"]);
    const left = letters.map((value, index) => ({
      id: `left-${index}`,
      value,
    }));
    const right = shuffle(
      letters.map((value, index) => ({
        id: `right-${index}`,
        value: value.toUpperCase(),
      })),
    );
    setLeftLetters(left);
    setRightLetters(right);
    setSelectedLeft(null);
    setMatchedPairs([]);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const shuffle = (array: ILetter[]): ILetter[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const handleLeftLetterPress = (letter: ILetter) => {
    if (!matchedPairs.includes(letter.value)) {
      setSelectedLeft(letter);
    }
  };

  const handleRightLetterPress = (letter: ILetter) => {
    if (selectedLeft && selectedLeft.value.toUpperCase() === letter.value) {
      setMatchedPairs([...matchedPairs, selectedLeft.value]);
      setSelectedLeft(null);
      if (matchedPairs.length + 1 === leftLetters.length) {
        Alert.alert("Level", "Completed", [
          { text: "Play Again", onPress: initializeGame },
        ]);
      }
    } else {
      setSelectedLeft(null);
    }
  };

  const renderLetters = (
    letters: ILetter[],
    onPress: (letter: ILetter) => void,
    isRight: boolean,
  ) => (
    <View className="items-center">
      {letters.map((letter) => {
        return (
          <View key={letter.id} className="items-center">
            <TouchableOpacity
              className={clsx(
                "my-[14px] size-[64px] items-center justify-center rounded-[10px] ",
                {
                  "bg-[#8AC65B]": matchedPairs.includes(
                    letter.value.toLowerCase(),
                  ),
                  "bg-[#7471F0]": selectedLeft?.id === letter.id,
                  "bg-colors-purple-500":
                    !matchedPairs.includes(letter.value.toLowerCase()) &&
                    selectedLeft?.id !== letter.id,
                },
              )}
              onPress={() => onPress(letter)}
            >
              <Text className="text-2xl font-bold text-white">
                {letter.value}
              </Text>
              <View
                className={clsx("absolute size-4  rounded-full border-2 ", {
                  "right-24": isRight,
                  "left-24": !isRight,
                  "bg-[#8AC65B] border-[#8AC65B]": matchedPairs.includes(
                    letter.value.toLowerCase(),
                  ),
                  "bg-[#7471F0] border-[#7471F0]":
                    selectedLeft?.id === letter.id,
                  "border-colors-purple-500":
                    !matchedPairs.includes(letter.value.toLowerCase()) &&
                    selectedLeft?.id !== letter.id,
                })}
                onLayout={(e) => {
                  (e.target as ViewInstance).measure(
                    (x, y, width, height, pageX, pageY) => {
                      if (layoutValuesRef.current) {
                        layoutValuesRef.current = [
                          ...layoutValuesRef.current,
                          {
                            x: -x + pageX,
                            y: y + pageY,
                            id: letter.id,
                            value: letter.value,
                          },
                        ];
                      } else {
                        layoutValuesRef.current = [
                          {
                            id: letter.id,
                            x: -x + pageX,
                            y: y + pageY,
                            value: letter.value,
                          },
                        ];
                      }
                    },
                  );
                }}
              />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  const checkLeftLetterValue = ({ y1 }: { y1: number }) => {
    if (!layoutValuesRef.current) return "";
    let letterFoundInLeft = "";

    for (let index = 0; index < layoutValuesRef.current.length; index++) {
      const element = layoutValuesRef.current[index];
      if (element.id.includes("left")) {
        const a = y1 + 90;
        const b = element.y;

        const difference = Math.abs(a - b);
        if (difference <= 40) {
          letterFoundInLeft = element.value;
        }
      }
    }
    return letterFoundInLeft.toLowerCase();
  };

  const checkRightLetterValue = ({ y1 }: { y1: number }) => {
    if (!layoutValuesRef.current) return "";
    let letterFoundInRight = "";

    for (let index = 0; index < layoutValuesRef.current.length; index++) {
      const element = layoutValuesRef.current[index];
      if (element.id.includes("right")) {
        const a = y1 + 90;
        const b = element.y;

        const difference = Math.abs(a - b);
        if (difference <= 40) {
          letterFoundInRight = element.value;
        }
      }
    }
    return letterFoundInRight.toLowerCase();
  };

  return (
    <SafeAreaView>
      {/* <Header title="Matching" modalRef={dynamicModalRef} /> */}
      <View className="relative flex flex-row justify-between border-yellow-500  px-10">
        {renderLetters(leftLetters, handleLeftLetterPress, false)}
        <View className=" flex-1 border-pink-500">
          <View {...panResponder.panHandlers} className="flex-1">
            <Svg height="100%" width="100%">
              {paths.map((p, index) => (
                <React.Fragment key={index}>
                  <SvgPath
                    d={p.pathString}
                    stroke="#8AC65B"
                    strokeWidth="2"
                    fill="none"
                  />
                </React.Fragment>
              ))}
              <SvgPath
                d={currentPath}
                stroke="blue"
                strokeWidth="2"
                fill="none"
              />
            </Svg>
          </View>
        </View>
        {renderLetters(rightLetters, handleRightLetterPress, true)}
      </View>
    </SafeAreaView>
  );
};

export default LetterTapMatching;
