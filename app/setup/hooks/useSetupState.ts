import { useReducer } from 'react';
import { SetupState, SetupAction, initialSetupState } from '../types/setupTypes';

function setupReducer(state: SetupState, action: SetupAction): SetupState {
  switch (action.type) {
    case 'SET_GROUP_ID':
      return { ...state, groupId: action.payload };
    case 'SET_GROUP_NAME':
      return { ...state, groupName: action.payload };
    case 'SET_GROUP_KEY':
      return { ...state, groupKey: action.payload };
    case 'SET_DEVICE_ID':
      return { ...state, deviceId: action.payload };
    case 'SET_COURT_ID':
      return { ...state, courtId: action.payload };
    case 'SET_COURT_NAME':
      return { ...state, courtName: action.payload };
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    case 'ADD_PLAYER':
      return { ...state, players: [action.payload, ...state.players] };
    case 'REMOVE_PLAYER':
      return { ...state, players: state.players.filter(p => p.id !== action.payload) };
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'SET_PLAYERS_ORDER':
      return { ...state, players: action.payload };
    case 'SET_NEW_PLAYER_NAME':
      return { ...state, newPlayerName: action.payload };
    case 'SET_NEW_PLAYER_GENDER':
      return { ...state, newPlayerGender: action.payload };
    case 'SET_NEW_PLAYER_PHONE':
      return { ...state, newPlayerPhone: action.payload };
    case 'SET_SHOW_PHONE_INPUT':
      return { ...state, showPhoneInput: action.payload };
    case 'SET_IS_ADDING':
      return { ...state, isAdding: action.payload };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    case 'SET_IS_SEARCHING':
      return { ...state, isSearching: action.payload };
    case 'SET_SHOW_SEARCH_RESULTS':
      return { ...state, showSearchResults: action.payload };
    case 'SET_SAVE_MODAL_VISIBLE':
      return { ...state, saveModalVisible: action.payload };
    case 'SET_SAVE_AS_NAME':
      return { ...state, saveAsName: action.payload };
    case 'SET_CONFIG_MODAL_VISIBLE':
      return { ...state, configModalVisible: action.payload };
    case 'SET_EDITING_PLAYER':
      return { ...state, editingPlayer: action.payload };
    case 'SET_EDIT_NAME':
      return { ...state, editName: action.payload };
    case 'SET_EDIT_LAST_NAME':
      return { ...state, editLastName: action.payload };
    case 'SET_EDIT_GENDER':
      return { ...state, editGender: action.payload };
    case 'SET_EDIT_PHONE':
      return { ...state, editPhone: action.payload };
    case 'SET_EDIT_DUPR':
      return { ...state, editDupr: action.payload };
    case 'SET_EDIT_HOME_COURT_ID':
      return { ...state, editHomeCourtId: action.payload };
    case 'SET_ALL_COURTS':
      return { ...state, allCourts: action.payload };
    case 'SET_SHOW_COURT_PICKER':
      return { ...state, showCourtPicker: action.payload };
    case 'SET_COURT_SEARCH_TEXT':
      return { ...state, courtSearchText: action.payload };
    case 'SET_ROUNDS_CONFIG':
      return { ...state, roundsConfig: action.payload };
    case 'SET_IS_FIXED_TEAMS':
      return { ...state, isFixedTeams: action.payload };
    case 'ADD_ROUND':
      return {
        ...state,
        roundsConfig: [...state.roundsConfig, { type: 'mixed' }],
      };
    case 'REMOVE_ROUND':
      return {
        ...state,
        roundsConfig:
          state.roundsConfig.length > 1
            ? state.roundsConfig.slice(0, -1)
            : state.roundsConfig,
      };
    case 'UPDATE_ROUND_TYPE':
      return {
        ...state,
        roundsConfig: state.roundsConfig.map((conf, i) =>
          i === action.payload.index ? { ...conf, type: action.payload.type } : conf
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET':
      return initialSetupState;
    default:
      return state;
  }
}

export function useSetupState() {
  const [state, dispatch] = useReducer(setupReducer, initialSetupState);
  return { state, dispatch };
}
