import { Tabs } from "expo-router/js-tabs";
import React from "react";
import type { JSX } from "react/jsx-runtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SectionColorTheme } from "@/constants/routes";
import { APP_COLORS, SECTION_COLORS } from "@/constants/routes";
import TabIconWrapper from "@/ui/icons/bottom-tab/bottom-tab-wrapper";
import { DragIcon } from "@/ui/icons/bottom-tab/drag-and-drop-icon";
import { EarIcon } from "@/ui/icons/bottom-tab/ear-icon";
import { TeacherIcon } from "@/ui/icons/bottom-tab/teacher-icon";
import { BOTTOM_TAB_HEIGHT, IS_IOS } from "@/utils/layout";

export const sectionColor = SECTION_COLORS.blending;

// Default color theme
export const SECTION_COLOR: SectionColorTheme = {
  appBackgroundColor: APP_COLORS.backgroundgrey,
  appWhiteColor: APP_COLORS.offwhite,
  appBlackColor: APP_COLORS.offblack,
  appGreyColor: APP_COLORS.grey,
  appGreenColor: APP_COLORS.green,
  appRedColor: APP_COLORS.red,
  sectionPrimaryColor: sectionColor.primary,
  sectionSecondaryColor: sectionColor.light,
};

type TabType = {
  name: string;
  label: string;
  icon: (props: { lineColor: string }) => JSX.Element;
};

const tabs: TabType[] = [
  {
    name: "blending-flashcard-tab",
    label: "blending-flashcard-tab",
    icon: TeacherIcon,
  },
  {
    name: "multiple-choice",
    label: "multiple-choice",
    icon: EarIcon,
  },
  {
    name: "audio-multiple-choice",
    label: "audio-multiple-choice",
    icon: DragIcon,
  },
  {
    name: "spelling-drag-and-drop",
    label: "spelling-drag-and-drop",
    icon: DragIcon,
  },
];

export default function LevelTwoTabLayout() {
  const { bottom: safe_area_bottom_inset } = useSafeAreaInsets();
  const paddingTop = 20;

  // TODO: Wants to go to tab "spelling" - Unless I include this code...
  // Need help from Om
  // useEffect(() => {
  //   // Force navigation to the correct tab on mount
  //   router.replace("/(level-two)/blending-flashcard");
  // }, [router]);

  return (
    <Tabs
      initialRouteName="blending-flashcard-tab"
      screenOptions={({}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: sectionColor.primary,
          paddingTop,
          height: BOTTOM_TAB_HEIGHT + (IS_IOS ? 0 : safe_area_bottom_inset),
          paddingBottom: IS_IOS ? 0 : safe_area_bottom_inset,
          paddingHorizontal: 12,
        },
        // tabBarInactiveTintColor: "white",
        // tabBarActiveTintColor: "black",
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      })}
    >
      {tabs.map(({ name, label, icon }) => {
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: label,
              // eslint-disable-next-line react/no-unstable-nested-components
              tabBarIcon: ({ focused }) => (
                <TabIconWrapper
                  focused={focused}
                  sectionColor={sectionColor}
                  icon={icon}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
