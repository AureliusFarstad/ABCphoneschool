import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ViewInstance } from "react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path as SvgPath } from "react-native-svg";

import { APP_COLORS, SECTION_COLORS } from "@/constants/routes";
import { useGuideAudio } from "@/core/hooks/useGuideAudio";
import { useLevelStore } from "@/core/store/levels";
import { Text, TouchableOpacity } from "@/ui";
import GuidanceAudioHeader from "@/ui/core/headers/guidance-audio";
import type { ButtonColorProps } from "@/ui/icons/circular/color-scheme";
import { ScissorButton } from "@/ui/icons/circular/scissor-button";
import { globalStyles } from "@/ui/styles";
import { shuffleLetters } from "@/utils/level-one";

type Path = {
  pathString: string;
  startingPoint: { x1: number; y1: number };
  endingPoint: { x2: number; y2: number };
};

interface ILetter {
  id: string;
  value: string;
}

const LetterTapMatching = () => {
  const { levels, updateLevels } = useLevelStore();
  const activeActivity = useRef(levels[0].modules[0].sections[4].activities[0]);

  const {
    playGuideAudio,
    stopGuideAudio,
    isPlaying: isPlayingGuidanceAudio,
  } = useGuideAudio({
    screenName: "letter-matching",
    module: "alphabet-module",
  });

  const [leftLetters, setLeftLetters] = useState<ILetter[]>([]);
  const [rightLetters, setRightLetters] = useState<ILetter[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<ILetter | null>(null);
  const [selectedRight, setSelectedRight] = useState<ILetter | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [incorrectMatch, setIncorrectMatch] = useState<{
    left: string | null;
    right: string | null;
  }>({
    left: null,
    right: null,
  });
  const [paths, setPaths] = useState<Path[]>([]);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showScissorButton, setShowScissorButton] = useState(false);

  const tappedPath = useRef<Path | undefined>(undefined);
  const svgContainerRef = useRef<ViewInstance>(null);
  const dotRefs = useRef<{ [key: string]: ViewInstance }>({});

  const initializeGame = useCallback(() => {
    const letters = shuffleLetters(activeActivity.current.letters ?? []);
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
    setSelectedRight(null);
    setMatchedPairs([]);
    setPaths([]);
    setGameCompleted(false);
    setShowScissorButton(false);
    dotRefs.current = {};
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const shuffle = (array: ILetter[]): ILetter[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const checkAndHandleMatch = useCallback(
    (leftLetter: ILetter, rightLetter: ILetter) => {
      if (leftLetter.value.toUpperCase() === rightLetter.value) {
        // Correct match
        setMatchedPairs([...matchedPairs, leftLetter.value]);
        if (tappedPath?.current) {
          const updatedPaths = [...paths, tappedPath.current];
          setPaths(updatedPaths);
        }
        tappedPath.current = undefined;
        setSelectedLeft(null);
        setSelectedRight(null);

        // Check if all pairs are matched
        if (matchedPairs.length + 1 === leftLetters.length) {
          setGameCompleted(true);
          const updatedLevels = levels.map((level: ILevel) => {
            if (level.id !== levels[0].id) return level;

            const _updatedModules = level.modules.map((sublevel) => {
              if (sublevel.id !== levels[0].modules[0].id) return sublevel;

              const _updatedSections = sublevel.sections.map(
                (section: ISection) => {
                  if (section.id !== levels[0].modules[0].sections[4].id)
                    return section;

                  const _updatedActivities = section.activities.map(
                    (activity: IActivity) => {
                      if (activity.id !== activeActivity.current.id)
                        return activity;

                      return {
                        ...activity,
                        numberOfTimesCorrectAnswerGiven:
                          activity.numberOfTimesCorrectAnswerGiven + 1,
                      };
                    },
                  );

                  return {
                    ...section,
                    activities: _updatedActivities,
                  };
                },
              );

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
          updateLevels(updatedLevels);
        }
      } else {
        // Incorrect match
        setIncorrectMatch({
          left: leftLetter.id,
          right: rightLetter.id,
        });
        setTimeout(() => {
          setIncorrectMatch({
            left: null,
            right: null,
          });
        }, 500);
        setSelectedLeft(null);
        setSelectedRight(null);
        tappedPath.current = undefined;
      }
    },
    [matchedPairs, paths, leftLetters.length, levels, updateLevels],
  );

  const handleLeftLetterPress = (letter: ILetter) => {
    if (matchedPairs.includes(letter.value)) return;

    if (selectedRight) {
      // Right letter already selected, check for match
      checkAndHandleMatch(letter, selectedRight);
    } else {
      // Select this left letter
      setSelectedLeft(letter);
      setSelectedRight(null);
    }
  };

  const handleRightLetterPress = (letter: ILetter) => {
    if (matchedPairs.includes(letter.value.toLowerCase())) return;

    if (selectedLeft) {
      // Left letter already selected, check for match
      checkAndHandleMatch(selectedLeft, letter);
    } else {
      // Select this right letter
      setSelectedRight(letter);
      setSelectedLeft(null);
    }
  };

  useEffect(() => {
    if (
      activeActivity.current.letters &&
      matchedPairs.length === activeActivity.current.letters?.length &&
      matchedPairs.length > 0
    ) {
      setGameCompleted(true);
    }
  }, [matchedPairs]);

  useEffect(() => {
    let timerId: number | undefined;
    if (gameCompleted) {
      timerId = setTimeout(() => {
        setShowScissorButton(true);
      }, 500);
    } else {
      setShowScissorButton(false);
    }

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [gameCompleted]);

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
                  "bg-[#62CC82]": matchedPairs.includes(
                    letter.value.toLowerCase(),
                  ),
                  "bg-[#FF5A5F]":
                    incorrectMatch.left === letter.id ||
                    incorrectMatch.right === letter.id,
                  "bg-[#7471F0]":
                    (selectedLeft?.id === letter.id ||
                      selectedRight?.id === letter.id) &&
                    incorrectMatch.left !== letter.id &&
                    incorrectMatch.right !== letter.id,
                  "bg-[#C385F8]":
                    !matchedPairs.includes(letter.value.toLowerCase()) &&
                    selectedLeft?.id !== letter.id &&
                    selectedRight?.id !== letter.id &&
                    incorrectMatch.left !== letter.id &&
                    incorrectMatch.right !== letter.id,
                },
              )}
              onPress={() => {
                // Get dot and SVG positions directly
                const dotRef = dotRefs.current[letter.id];
                if (!dotRef || !svgContainerRef.current) return;

                Promise.all([
                  new Promise<{
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                  }>((resolve) => {
                    dotRef.measure((x, y, width, height, pageX, pageY) => {
                      resolve({ x: pageX, y: pageY, width, height });
                    });
                  }),
                  new Promise<{ x: number; y: number }>((resolve) => {
                    svgContainerRef.current!.measure(
                      (x, y, width, height, pageX, pageY) => {
                        resolve({ x: pageX, y: pageY });
                      },
                    );
                  }),
                ]).then(([dotPos, svgPos]) => {
                  // Calculate dot center relative to SVG
                  const tileCenterX = dotPos.x + dotPos.width / 2 - svgPos.x;
                  const tileCenterY = dotPos.y + dotPos.height / 2 - svgPos.y;

                  // Determine if this is the first selection or completing a match
                  const isFirstSelection = !selectedLeft && !selectedRight;
                  const isCompletingMatch =
                    (isRight && selectedLeft) || (!isRight && selectedRight);

                  if (isFirstSelection) {
                    // First selection - store starting point
                    tappedPath.current = {
                      pathString: "",
                      startingPoint: {
                        x1: tileCenterX,
                        y1: tileCenterY,
                      },
                      endingPoint: {
                        x2: 0,
                        y2: 0,
                      },
                    };
                  } else if (isCompletingMatch) {
                    // Completing a match - draw line to this point
                    if (!tappedPath.current) return;

                    tappedPath.current = {
                      pathString: `M${tappedPath.current.startingPoint.x1},${tappedPath.current.startingPoint.y1} L${tileCenterX},${tileCenterY}`,
                      startingPoint: tappedPath.current.startingPoint,
                      endingPoint: {
                        x2: tileCenterX,
                        y2: tileCenterY,
                      },
                    };
                  }
                  onPress(letter);
                });
              }}
            >
              <Text
                style={{
                  fontFamily: "Thomas",
                  fontSize: 42,
                  lineHeight: 52,
                  color: APP_COLORS.offwhite,
                }}
              >
                {letter.value}
              </Text>
              <View
                ref={(ref) => {
                  if (ref) {
                    dotRefs.current[letter.id] = ref;
                  }
                }}
                className={clsx("absolute size-4 rounded-full border-2", {
                  "right-24": isRight,
                  "left-24": !isRight,
                  "bg-[#62CC82] border-[#62CC82]": matchedPairs.includes(
                    letter.value.toLowerCase(),
                  ),
                  "bg-[#FF0000] border-[#FF0000]":
                    incorrectMatch.left === letter.id ||
                    incorrectMatch.right === letter.id,
                  "bg-[#7471F0] border-[#7471F0]":
                    (selectedLeft?.id === letter.id ||
                      selectedRight?.id === letter.id) &&
                    incorrectMatch.left !== letter.id &&
                    incorrectMatch.right !== letter.id,
                  "border-colors-purple-500":
                    !matchedPairs.includes(letter.value.toLowerCase()) &&
                    selectedLeft?.id !== letter.id &&
                    selectedRight?.id !== letter.id &&
                    incorrectMatch.left !== letter.id &&
                    incorrectMatch.right !== letter.id,
                })}
              />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  const scissorButtonColorProps: ButtonColorProps = {
    primaryColor: SECTION_COLORS.alphabet.primary,
    secondaryColor: SECTION_COLORS.alphabet.light,
    offwhiteColor: APP_COLORS.offwhite,
    offblackColor: APP_COLORS.offblack,
    backgroundColor: APP_COLORS.backgroundgrey,
  };

  const handleScissorPress = () => {
    initializeGame();
  };

  return (
    <SafeAreaView style={globalStyles.safeAreaView}>
      <GuidanceAudioHeader
        title="Letter Matching"
        isPlaying={isPlayingGuidanceAudio}
        onPressGuide={playGuideAudio}
        onStopGuide={stopGuideAudio}
        showLetterCaseSwitch={false}
      />
      <View className="relative flex flex-row justify-between bg-[#F2EFF0] px-10">
        {renderLetters(leftLetters, handleLeftLetterPress, false)}
        <View className="z-10 flex-1" ref={svgContainerRef}>
          <Svg height="100%" width="100%">
            {paths.map((p, index) => (
              <React.Fragment key={index}>
                <SvgPath
                  d={p.pathString}
                  stroke="#62CC82"
                  strokeWidth="2"
                  fill="none"
                />
              </React.Fragment>
            ))}
          </Svg>
          {showScissorButton && (
            <View className="absolute inset-0 items-center justify-center">
              <TouchableOpacity onPress={handleScissorPress}>
                <ScissorButton {...scissorButtonColorProps} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {renderLetters(rightLetters, handleRightLetterPress, true)}
      </View>
    </SafeAreaView>
  );
};

export default LetterTapMatching;
