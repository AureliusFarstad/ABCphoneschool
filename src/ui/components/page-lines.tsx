import React from "react";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { WIDTH } from "@/utils/layout";

// Handwriting guide lines drawn behind the animated letters
export const PageLinesSVG = () => {
  return (
    <View className=" overflow-hidden">
      <Svg
        width={WIDTH - 16}
        height="180"
        viewBox={`0 0 ${WIDTH - 16} 143`}
        fill="none"
      >
        <Line
          x1="-9.00391"
          y1="141.295"
          x2={WIDTH - 16}
          y2="141.295"
          stroke="#E4E4E7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 8"
        />
        <Line
          x1="-10.0039"
          y1="96.8115"
          x2={WIDTH - 16}
          y2="96.8115"
          stroke="#E4E4E7"
          strokeWidth="2"
        />
        <Line
          x1="-9.00391"
          y1="46.3955"
          x2={WIDTH - 16}
          y2="46.3955"
          stroke="#E4E4E7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 8"
        />
        <Line
          x1="-10.0039"
          y1="1.91113"
          x2={WIDTH - 16}
          y2="1.91113"
          stroke="#E4E4E7"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};
