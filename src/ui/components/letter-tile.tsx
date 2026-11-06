import clsx from "clsx";
import React from "react";

import { Text, View } from "@/ui";
import { globalStyles } from "@/ui/styles";

type LetterTileProps = {
  label: string;
  size: number;
  isActive?: boolean;
};

// Same look as the letter tiles in the letter-formation bottom bar
export const LetterTile = ({
  label,
  size,
  isActive = false,
}: LetterTileProps) => {
  return (
    <View
      className={clsx("flex items-center justify-center rounded-md", {
        "bg-colors-gray-300": !isActive,
        "bg-colors-purple-500": isActive,
      })}
      style={{ width: size, height: size }}
    >
      <Text style={globalStyles.thomasFont}>{label}</Text>
    </View>
  );
};
