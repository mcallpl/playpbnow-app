import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  size: number;
  color: string;
  strokeWidth: number;
}

// live.svg — small circle with two outer rings
export const LiveIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="7" stroke={color} strokeWidth={strokeWidth * 0.75} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    <Circle cx="12" cy="12" r="11" stroke={color} strokeWidth={strokeWidth * 0.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
  </Svg>
);

// connection.svg — dot with two arcs above
export const ConnectionIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="18" r="2" fill={color} />
    <Path d="M8.5 13.5a5 5 0 0 1 7 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 10a9 9 0 0 1 14 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
