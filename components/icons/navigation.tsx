import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size: number;
  color: string;
  strokeWidth: number;
}

// groups.svg — 3 stacked rounded rectangles
export const GroupsIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="3" width="14" height="8" rx="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="3" y="7" width="14" height="8" rx="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    <Rect x="7" y="11" width="14" height="8" rx="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// playnow.svg — beacon/signal with center circle + radiating arcs
export const PlayNowIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.5 7.5a6.36 6.36 0 0 0 0 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.5 7.5a6.36 6.36 0 0 1 0 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4.5 4.5a11.31 11.31 0 0 0 0 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19.5 4.5a11.31 11.31 0 0 1 0 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// players.svg — 2 overlapping head-and-shoulder outlines
export const PlayersIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 20c0-3.31 2.69-6 6-6h2c3.31 0 6 2.69 6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="16" cy="7" r="2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18 14h1c2.76 0 5 2.24 5 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// leaderboard.svg — 3 ascending vertical bars
export const LeaderboardIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="14" width="5" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="9.5" y="3" width="5" height="18" rx="1.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="16" y="8" width="5" height="13" rx="1.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
