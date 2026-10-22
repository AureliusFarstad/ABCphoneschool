import { Tabs } from "expo-router/js-tabs";
import React from "react";
import type { JSX } from "react/jsx-runtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SECTION_COLORS } from "@/constants/routes";
import TabIconWrapper from "@/ui/icons/bottom-tab/bottom-tab-wrapper";
import { ConversationIcon } from "@/ui/icons/bottom-tab/conversation-icon";
import { DragIcon } from "@/ui/icons/bottom-tab/drag-and-drop-icon";
import { TeacherIcon } from "@/ui/icons/bottom-tab/teacher-icon";
import { BOTTOM_TAB_HEIGHT, IS_IOS } from "@/utils/layout";

export const sectionColor = SECTION_COLORS.speaking;

type TabType = {
  name: string;
  label: string;
  icon: (props: { lineColor: string }) => JSX.Element;
};

const tabs: TabType[] = [
  {
    name: "listening",
    label: "listening",
    icon: ConversationIcon,
  },
  {
    name: "video-explanation",
    label: "video-explanation",
    icon: TeacherIcon,
  },
  {
    name: "audio-ordering",
    label: "audio-ordering",
    icon: DragIcon,
  },
];

export default function LevelTwoTabLayout() {
  const { bottom: safe_area_bottom_inset } = useSafeAreaInsets();
  const paddingTop = 20;

  return (
    <Tabs
      initialRouteName="listening"
      backBehavior="order"
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
