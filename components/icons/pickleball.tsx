import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface IconProps {
  size: number;
  color: string;
  strokeWidth: number;
}

// court.svg — rounded rectangle with center net line + kitchen lines
export const CourtIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="2" y1="9" x2="22" y2="9" stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" opacity={0.5} />
    <Line x1="2" y1="15" x2="22" y2="15" stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" opacity={0.5} />
  </Svg>
);

// matchquality.svg — balance scale
export const MatchQualityIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Path d="M5 7l7-4 7 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 13l3-6 3 6a3 3 0 0 1-6 0z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 13l3-6 3 6a3 3 0 0 1-6 0z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// reliability.svg — shield with small check inside
export const ReliabilityIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l7 4v5c0 5.25-3.5 8.74-7 10-3.5-1.26-7-4.75-7-10V6l7-4z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// filter.svg — funnel shape
export const FilterIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// search.svg — magnifying glass
export const SearchIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// location.svg — map pin outline
export const LocationIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
