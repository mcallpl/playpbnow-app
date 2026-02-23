import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface IconProps {
  size: number;
  color: string;
  strokeWidth: number;
}

// add.svg — plus in circle
export const AddIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// close.svg — X in circle
export const CloseIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// menu.svg — three horizontal rounded bars
export const MenuIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="4" y1="6" x2="20" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="4" y1="18" x2="20" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// chevron-right
export const ChevronRightIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// chevron-left
export const ChevronLeftIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// back — left arrow
export const BackIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 19l-7-7 7-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// copy — two overlapping rectangles
export const CopyIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// link — chain link
export const LinkIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// enter — arrow entering box
export const EnterIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 17l5-5-5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="15" y1="12" x2="3" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// phone — handset outline
export const PhoneIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// eye — eye outline
export const EyeIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// settings — gear outline
export const SettingsIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// logout — exit door with arrow
export const LogoutIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17l5-5-5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// info — "i" in circle
export const InfoIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="12" cy="8" r="0.5" fill={color} stroke={color} strokeWidth="0.5" />
  </Svg>
);

// notification — bell outline
export const NotificationIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// home — house outline
export const HomeIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V12h6v10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// minus — minus in circle
export const MinusIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// flash — lightning bolt outline
export const FlashIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// checkbox — square with optional check
export const CheckboxIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// checkbox-empty — empty square
export const CheckboxEmptyIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// gender-male — simplified male symbol
export const GenderMaleIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="10" cy="14" r="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 3l-5.5 5.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 3h5v5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// gender-female — simplified female symbol
export const GenderFemaleIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="9" r="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="15" x2="12" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="9" y1="19" x2="15" y2="19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// theme-toggle — moon/sun hybrid
export const ThemeToggleIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// person-add — person with plus
export const PersonAddIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="19" y1="8" x2="19" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="16" y1="11" x2="22" y2="11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// refresh — single circular arrow
export const RefreshIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 4v6h-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// game-controller — simplified controller
export const GameControllerIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 12H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4l2-4h4l2 4h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="6" y="4" width="12" height="8" rx="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// document — document with lines
export const DocumentIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// layers — stacked layers
export const LayersIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 17l10 5 10-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 12l10 5 10-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// stats-chart — bar chart
export const StatsChartIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// headset — headphone outline
export const HeadsetIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// rocket — rocket outline
export const RocketIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// tennisball — circle with curved lines (for empty states)
export const TennisballIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5.5 5.5c3.5 3 3.5 10 0 13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 5.5c-3.5 3-3.5 10 0 13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// star — star outline
export const StarIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// chat — speech bubble outline
export const ChatIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// send — paper plane / send arrow
export const SendIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
