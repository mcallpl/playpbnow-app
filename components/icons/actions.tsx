import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface IconProps {
  size: number;
  color: string;
  strokeWidth: number;
}

// confirm.svg — checkmark inside circle
export const ConfirmIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 12l3 3 5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// checkmark.svg — simple checkmark (no circle)
export const CheckmarkIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// lock.svg — padlock outline
export const LockIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="11" width="14" height="10" rx="2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="16" r="1.5" fill={color} />
  </Svg>
);

// start.svg — play triangle in circle
export const StartIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 8l6 4-6 4V8z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// save.svg — floppy disk outline
export const SaveIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 21v-8H7v8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 3v5h8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// sync.svg — two curved arrows forming circle
export const SyncIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2v6h-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 22v-6h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// warning.svg — rounded triangle with exclamation
export const WarningIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="12" cy="17" r="0.5" fill={color} stroke={color} strokeWidth="0.5" />
  </Svg>
);

// edit.svg — pencil outline
export const EditIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// trash.svg — trash can outline
export const TrashIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// share.svg — share/export arrow
export const ShareIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 6l-4-4-4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="2" x2="12" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

// shuffle.svg — crossed arrows
export const ShuffleIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 3h5v5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 20L21 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 16v5h-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 15l6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 4l5 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// merge.svg — merge/combine arrows
export const MergeIcon = ({ size, color, strokeWidth }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="18" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="6" cy="6" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="18" cy="6" r="3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 9v3c0 1.66 1.34 3 3 3h6c1.66 0 3-1.34 3-3V9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
