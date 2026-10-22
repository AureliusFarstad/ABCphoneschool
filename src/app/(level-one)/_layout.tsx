import { Tabs } from "expo-router/js-tabs";
import React from "react";
import type { JSX } from "react/jsx-runtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SECTION_COLORS } from "@/constants/routes";
import TabIconWrapper from "@/ui/icons/bottom-tab/bottom-tab-wrapper";
import { ConnectIcon } from "@/ui/icons/bottom-tab/connect-icon";
import { EarIcon } from "@/ui/icons/bottom-tab/ear-icon";
import { NameIcon } from "@/ui/icons/bottom-tab/name-icon";
import { PencilIcon } from "@/ui/icons/bottom-tab/pencil-icon";
import { TeacherIcon } from "@/ui/icons/bottom-tab/teacher-icon";
import { BOTTOM_TAB_HEIGHT, IS_IOS } from "@/utils/layout";

export const SECTION_COLOR = SECTION_COLORS.alphabet;

type TabType = {
  name: string;
  label: string;
  icon: (props: { lineColor: string }) => JSX.Element;
};

const tabs: TabType[] = [
  {
    name: "letter-introduction",
    label: "letter-introduction",
    icon: TeacherIcon,
  },
  {
    name: "letter-formation",
    label: "letter-formation",
    icon: PencilIcon,
  },
  {
    name: "letter-sound",
    label: "letter-sound",
    icon: EarIcon,
  },
  {
    name: "letter-name",
    label: "letter-name",
    icon: NameIcon,
  },
  {
    name: "letter-matching",
    label: "letter-matching",
    icon: ConnectIcon,
  },
];

export default function LevelTwoTabLayout() {
  const { bottom: safe_area_bottom_inset } = useSafeAreaInsets();

  // User hardcoded paddingTop,
  const paddingTop = 20;

  return (
    <Tabs
      backBehavior="order"
      initialRouteName="letter-introduction"
      screenOptions={({}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SECTION_COLOR.primary,
          paddingTop,
          height: BOTTOM_TAB_HEIGHT + (IS_IOS ? 0 : safe_area_bottom_inset),
          paddingBottom: IS_IOS ? 0 : safe_area_bottom_inset, // Add bottom padding for Android safe area
          paddingHorizontal: 12,
        },
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
                  sectionColor={SECTION_COLOR}
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
