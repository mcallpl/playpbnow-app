import React from 'react';
import {
  GroupsIcon, PlayNowIcon, PlayersIcon, LeaderboardIcon,
  ConfirmIcon, CheckmarkIcon, LockIcon, StartIcon, SaveIcon, SyncIcon,
  WarningIcon, EditIcon, TrashIcon, ShareIcon, ShuffleIcon, MergeIcon,
  CourtIcon, MatchQualityIcon, ReliabilityIcon, FilterIcon, SearchIcon, LocationIcon,
  LiveIcon, ConnectionIcon,
  AddIcon, CloseIcon, MenuIcon, ChevronRightIcon, ChevronLeftIcon, BackIcon,
  CopyIcon, LinkIcon, EnterIcon, PhoneIcon, EyeIcon, SettingsIcon, LogoutIcon,
  InfoIcon, NotificationIcon, HomeIcon, MinusIcon, FlashIcon,
  CheckboxIcon, CheckboxEmptyIcon, GenderMaleIcon, GenderFemaleIcon,
  ThemeToggleIcon, PersonAddIcon, RefreshIcon, GameControllerIcon,
  DocumentIcon, LayersIcon, StatsChartIcon, HeadsetIcon, RocketIcon,
  TennisballIcon, StarIcon, ChatIcon, SendIcon,
} from './icons';

type IconComponent = React.FC<{ size: number; color: string; strokeWidth: number }>;

const ICON_MAP: Record<string, IconComponent> = {
  // Navigation
  groups: GroupsIcon,
  playnow: PlayNowIcon,
  players: PlayersIcon,
  leaderboard: LeaderboardIcon,
  // Actions
  confirm: ConfirmIcon,
  checkmark: CheckmarkIcon,
  lock: LockIcon,
  start: StartIcon,
  save: SaveIcon,
  sync: SyncIcon,
  warning: WarningIcon,
  edit: EditIcon,
  trash: TrashIcon,
  share: ShareIcon,
  shuffle: ShuffleIcon,
  merge: MergeIcon,
  // Pickleball
  court: CourtIcon,
  matchquality: MatchQualityIcon,
  reliability: ReliabilityIcon,
  filter: FilterIcon,
  search: SearchIcon,
  location: LocationIcon,
  // Status
  live: LiveIcon,
  connection: ConnectionIcon,
  // Utility
  add: AddIcon,
  close: CloseIcon,
  menu: MenuIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  back: BackIcon,
  copy: CopyIcon,
  link: LinkIcon,
  enter: EnterIcon,
  phone: PhoneIcon,
  eye: EyeIcon,
  settings: SettingsIcon,
  logout: LogoutIcon,
  info: InfoIcon,
  notification: NotificationIcon,
  home: HomeIcon,
  minus: MinusIcon,
  flash: FlashIcon,
  checkbox: CheckboxIcon,
  'checkbox-empty': CheckboxEmptyIcon,
  'gender-male': GenderMaleIcon,
  'gender-female': GenderFemaleIcon,
  'theme-toggle': ThemeToggleIcon,
  'person-add': PersonAddIcon,
  refresh: RefreshIcon,
  'game-controller': GameControllerIcon,
  document: DocumentIcon,
  layers: LayersIcon,
  'stats-chart': StatsChartIcon,
  headset: HeadsetIcon,
  rocket: RocketIcon,
  tennisball: TennisballIcon,
  star: StarIcon,
  chat: ChatIcon,
  send: SendIcon,
};

interface BrandedIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

export function BrandedIcon({ name, size = 24, color = '#ffffff', strokeWidth = 2, style }: BrandedIconProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) {
    if (__DEV__) {
      console.warn(`BrandedIcon: Unknown icon "${name}"`);
    }
    return null;
  }
  return (
    <React.Fragment>
      <Icon size={size} color={color} strokeWidth={strokeWidth} />
    </React.Fragment>
  );
}
