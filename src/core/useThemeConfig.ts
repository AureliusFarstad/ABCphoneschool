import type { Theme } from "expo-router";
import { DefaultTheme } from "expo-router";

import { colors } from "@/ui/theme/colors";

export const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.white,
  },
};
