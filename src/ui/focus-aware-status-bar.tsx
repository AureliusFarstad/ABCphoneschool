import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";

type Props = React.ComponentProps<typeof StatusBar>;
export const FocusAwareStatusBar = (props: Props) => {
  const isFocused = useIsFocused();
  return isFocused ? <StatusBar style="auto" {...props} /> : null;
};
