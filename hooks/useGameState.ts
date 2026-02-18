import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Player } from './useGameLogic';

export interface GameState {
  groupName: string;
  groupKey: string;
  deviceId: string;
  isMatchScored: boolean;
  setIsMatchScored: (val: boolean) => void;
  reportModalVisible: boolean;
  setReportModalVisible: (val: boolean) => void;
  saveModalVisible: boolean;
  setSaveModalVisible: (val: boolean) => void;
  gatekeeperVisible: boolean;
  setGatekeeperVisible: (val: boolean) => void;
  modalVisible: boolean;
  setModalVisible: (val: boolean) => void;
  reportTitle: string;
  setReportTitle: (val: string) => void;
  saveTitle: string;
  setSaveTitle: (val: string) => void;
  selectedDate: Date;
  setSelectedDate: (val: Date) => void;
  generatingImg: boolean;
  setGeneratingImg: (val: boolean) => void;
  generatedImageUrl: string | null;
  setGeneratedImageUrl: (val: string | null) => void;
  newPlayerName: string;
  setNewPlayerName: (val: string) => void;
  searchResults: any[];
  setSearchResults: (val: any[]) => void;
  isSearching: boolean;
  setIsSearching: (val: boolean) => void;
  isSaving: boolean;
  setIsSaving: (val: boolean) => void;
  currentRoster: Player[];
  setCurrentRoster: (val: Player[]) => void;
  editingPlayer: {r:number,g:number,t:number,p:number} | null;
  setEditingPlayer: (val: {r:number,g:number,t:number,p:number} | null) => void;
}

export function useGameState(params: any): GameState {
  const [groupName, setGroupName] = useState(params.groupName as string || '');
  const [groupKey, setGroupKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isMatchScored, setIsMatchScored] = useState(true);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [gatekeeperVisible, setGatekeeperVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState(groupName || 'Pickleball Match');
  const [saveTitle, setSaveTitle] = useState(groupName || '');
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const playersData = params.players ? JSON.parse(params.players as string) : [];
  const [currentRoster, setCurrentRoster] = useState<Player[]>(playersData);
  const [editingPlayer, setEditingPlayer] = useState<{r:number,g:number,t:number,p:number} | null>(null);

  const getInitialDate = () => {
    const d = new Date();
    const m = d.getMinutes();
    const rounded = Math.ceil(m / 15) * 15;
    d.setMinutes(rounded);
    d.setSeconds(0);
    return d;
  };
  const [selectedDate, setSelectedDate] = useState(getInitialDate());

  const getDeviceId = async () => {
    let id = await AsyncStorage.getItem('device_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      await AsyncStorage.setItem('device_id', id);
    }
    return id;
  };

  useEffect(() => {
    const init = async () => {
      let currentName = params.groupName as string;
      if (currentName) {
        setReportTitle(currentName);
        setSaveTitle(currentName);
        await AsyncStorage.setItem('active_group_name', currentName);
        
        const storedKey = await AsyncStorage.getItem('active_group_key');
        if (storedKey) {
          setGroupKey(storedKey);
        }
      }

      const did = await getDeviceId();
      setDeviceId(did);
    };
    init();
  }, [params.groupName]);

  return {
    groupName,
    groupKey,
    deviceId,
    isMatchScored, setIsMatchScored,
    reportModalVisible, setReportModalVisible,
    saveModalVisible, setSaveModalVisible,
    gatekeeperVisible, setGatekeeperVisible,
    modalVisible, setModalVisible,
    reportTitle, setReportTitle,
    saveTitle, setSaveTitle,
    selectedDate, setSelectedDate,
    generatingImg, setGeneratingImg,
    generatedImageUrl, setGeneratedImageUrl,
    newPlayerName, setNewPlayerName,
    searchResults, setSearchResults,
    isSearching, setIsSearching,
    isSaving, setIsSaving,
    currentRoster, setCurrentRoster,
    editingPlayer, setEditingPlayer
  };
}
