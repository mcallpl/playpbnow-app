// Setup state types for match configuration and roster management

export interface Player {
  id: string;
  db_id?: number;
  first_name: string;
  last_name?: string;
  gender: string;
  cell_phone?: string;
  dupr_rating?: string;
  home_court_id?: number | null;
  home_court_name?: string | null;
  wins?: number;
  losses?: number;
  diff?: number;
  win_pct?: number;
  groups?: string[];
  is_verified?: boolean;
}

export interface Court {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
}

export interface SearchResult {
  id: number;
  player_key: string;
  first_name: string;
  last_name: string;
  gender: string;
  home_court_name: string | null;
  wins: number;
  losses: number;
  win_pct: number;
  groups: string[];
  is_verified: boolean;
  source: string;
}

export interface RoundConfig {
  type: 'mixed' | 'gender' | 'mixer';
}

export interface SetupState {
  // Group info
  groupId: string;
  groupName: string;
  groupKey: string;
  deviceId: string;
  courtId: number | null;
  courtName: string;

  // Players
  players: Player[];
  newPlayerName: string;
  newPlayerGender: 'male' | 'female';
  newPlayerPhone: string;
  showPhoneInput: boolean;
  isAdding: boolean;

  // Search
  searchResults: SearchResult[];
  isSearching: boolean;
  showSearchResults: boolean;

  // Modals
  saveModalVisible: boolean;
  saveAsName: string;
  configModalVisible: boolean;
  editingPlayer: Player | null;
  editName: string;
  editLastName: string;
  editGender: 'male' | 'female';
  editPhone: string;
  editDupr: string;
  editHomeCourtId: number | null;
  allCourts: Court[];
  showCourtPicker: boolean;
  courtSearchText: string;

  // Match config
  roundsConfig: RoundConfig[];
  isFixedTeams: boolean;

  // UI
  loading: boolean;
  error: string | null;
}

export type SetupAction =
  | { type: 'SET_GROUP_ID'; payload: string }
  | { type: 'SET_GROUP_NAME'; payload: string }
  | { type: 'SET_GROUP_KEY'; payload: string }
  | { type: 'SET_DEVICE_ID'; payload: string }
  | { type: 'SET_COURT_ID'; payload: number | null }
  | { type: 'SET_COURT_NAME'; payload: string }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'UPDATE_PLAYER'; payload: Player }
  | { type: 'SET_PLAYERS_ORDER'; payload: Player[] }
  | { type: 'SET_NEW_PLAYER_NAME'; payload: string }
  | { type: 'SET_NEW_PLAYER_GENDER'; payload: 'male' | 'female' }
  | { type: 'SET_NEW_PLAYER_PHONE'; payload: string }
  | { type: 'SET_SHOW_PHONE_INPUT'; payload: boolean }
  | { type: 'SET_IS_ADDING'; payload: boolean }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResult[] }
  | { type: 'SET_IS_SEARCHING'; payload: boolean }
  | { type: 'SET_SHOW_SEARCH_RESULTS'; payload: boolean }
  | { type: 'SET_SAVE_MODAL_VISIBLE'; payload: boolean }
  | { type: 'SET_SAVE_AS_NAME'; payload: string }
  | { type: 'SET_CONFIG_MODAL_VISIBLE'; payload: boolean }
  | { type: 'SET_EDITING_PLAYER'; payload: Player | null }
  | { type: 'SET_EDIT_NAME'; payload: string }
  | { type: 'SET_EDIT_LAST_NAME'; payload: string }
  | { type: 'SET_EDIT_GENDER'; payload: 'male' | 'female' }
  | { type: 'SET_EDIT_PHONE'; payload: string }
  | { type: 'SET_EDIT_DUPR'; payload: string }
  | { type: 'SET_EDIT_HOME_COURT_ID'; payload: number | null }
  | { type: 'SET_ALL_COURTS'; payload: Court[] }
  | { type: 'SET_SHOW_COURT_PICKER'; payload: boolean }
  | { type: 'SET_COURT_SEARCH_TEXT'; payload: string }
  | { type: 'SET_ROUNDS_CONFIG'; payload: RoundConfig[] }
  | { type: 'SET_IS_FIXED_TEAMS'; payload: boolean }
  | { type: 'ADD_ROUND' }
  | { type: 'REMOVE_ROUND' }
  | { type: 'UPDATE_ROUND_TYPE'; payload: { index: number; type: 'mixed' | 'gender' | 'mixer' } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

export const initialSetupState: SetupState = {
  groupId: '',
  groupName: '',
  groupKey: '',
  deviceId: '',
  courtId: null,
  courtName: '',
  players: [],
  newPlayerName: '',
  newPlayerGender: 'male',
  newPlayerPhone: '',
  showPhoneInput: false,
  isAdding: false,
  searchResults: [],
  isSearching: false,
  showSearchResults: false,
  saveModalVisible: false,
  saveAsName: '',
  configModalVisible: false,
  editingPlayer: null,
  editName: '',
  editLastName: '',
  editGender: 'male',
  editPhone: '',
  editDupr: '',
  editHomeCourtId: null,
  allCourts: [],
  showCourtPicker: false,
  courtSearchText: '',
  roundsConfig: [
    { type: 'mixed' },
    { type: 'mixed' },
    { type: 'mixed' },
    { type: 'mixed' },
    { type: 'mixed' },
    { type: 'mixed' },
  ],
  isFixedTeams: false,
  loading: false,
  error: null,
};
