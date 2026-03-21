import { BrandedIcon } from '../../components/BrandedIcon';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import {
  ThemeColors,
  FONT_DISPLAY_BOLD,
  FONT_DISPLAY_EXTRABOLD,
  FONT_DISPLAY_BLACK,
  FONT_BODY_REGULAR,
  FONT_BODY_MEDIUM,
  FONT_BODY_BOLD,
  FONT_BODY_SEMIBOLD,
} from '../../constants/theme';
import { haptic } from '../../utils/haptics';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

// ── Types ──

interface PoolPlayer {
  id: number;
  first_name: string;
  last_name: string;
  gender: string | null;
  play_level: string | null;
  phone: string;
  cities_to_play: string;
}

interface Broadcast {
  id: number;
  subject: string;
  sms_text: string;
  broadcast_code: string;
  sent_count: number;
  status: string;
  created_at: string;
}

interface Overview {
  users: { total: number; active_trials: number; active_subscriptions: number; expired: number };
  pool_players: { total: number; migrated: number; new_signups: number };
  scoring: { players: number; groups: number; matches: number; sessions: number; active_collab: number };
  invites: { total: number; active: number; responses: number; confirmed: number };
  broadcasts: { total: number; sms_sent: number };
  sms_credits: { in_system: number; purchased: number; used: number };
  courts: number;
}

interface ActivityData {
  recent_users: any[];
  recent_sessions: any[];
  active_collabs: any[];
  recent_invites: any[];
  recent_pool_signups: any[];
  recent_purchases: any[];
}

type DashTab = 'overview' | 'activity' | 'engage' | 'users' | 'players' | 'groups' | 'database' | 'broadcast';

export default function AdminDashboard() {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { isAdmin } = useSubscription();
  const { userId } = useAuth();

  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Overview
  const [overview, setOverview] = useState<Overview | null>(null);

  // Activity
  const [activity, setActivity] = useState<ActivityData | null>(null);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Players (leaderboard)
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // Engagement
  const [engagement, setEngagement] = useState<any | null>(null);

  // Database
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [dbBrowseTable, setDbBrowseTable] = useState<string | null>(null);
  const [dbColumns, setDbColumns] = useState<any[]>([]);
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [dbPage, setDbPage] = useState(1);
  const [dbTotalPages, setDbTotalPages] = useState(1);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbSearch, setDbSearch] = useState('');
  const [dbLoading, setDbLoading] = useState(false);
  const [dbEditRecord, setDbEditRecord] = useState<any | null>(null);
  const [dbEditFields, setDbEditFields] = useState<Record<string, string>>({});
  const [dbAddMode, setDbAddMode] = useState(false);
  const [dbAddFields, setDbAddFields] = useState<Record<string, string>>({});

  // AI Generator
  const [aiTheme, setAiTheme] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Broadcast
  const [broadcastTab, setBroadcastTab] = useState<'compose' | 'history' | 'quicksms'>('compose');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [smsText, setSmsText] = useState('');
  const [poolPlayers, setPoolPlayers] = useState<PoolPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<{ sentCount: number; failedCount: number; broadcastCode: string; sentNames: string[]; failedNames: string[] } | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Draft tracking — saves to DB so we can preview the real landing page
  const [draftId, setDraftId] = useState<number | null>(null);
  const [draftCode, setDraftCode] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Media upload
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [featuredImage, setFeaturedImage] = useState('');
  const uploadFnRef = React.useRef<((file: File) => void) | null>(null);

  const smsCharCount = smsText.length;
  const smsSegments = smsCharCount <= 160 ? 1 : Math.ceil(smsCharCount / 153);

  // Quick SMS
  const [quickSmsText, setQuickSmsText] = useState('');
  const [quickPersonalize, setQuickPersonalize] = useState(true);
  const [quickSending, setQuickSending] = useState(false);
  const [quickResults, setQuickResults] = useState<{ sentCount: number; failedCount: number; sentNames: string[]; failedNames: string[] } | null>(null);
  const [quickPlayerSearch, setQuickPlayerSearch] = useState('');
  const [quickSelectedPlayers, setQuickSelectedPlayers] = useState<number[]>([]);

  const quickCharCount = quickSmsText.length;
  const quickSegments = quickCharCount <= 160 ? 1 : Math.ceil(quickCharCount / 153);

  const toggleQuickPlayer = (id: number) => {
    haptic.tap();
    setQuickSelectedPlayers(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const quickFilteredPlayers = poolPlayers.filter(p => {
    if (!quickPlayerSearch.trim()) return true;
    const q = quickPlayerSearch.toLowerCase();
    return `${p.first_name} ${p.last_name} ${p.play_level} ${p.cities_to_play}`.toLowerCase().includes(q);
  });

  const handleSendQuickSms = async () => {
    if (!quickSmsText.trim()) { setError('Message is required'); return; }
    if (quickSelectedPlayers.length === 0) { setError('Select at least one recipient'); return; }
    setError('');

    const confirmMsg = `Send SMS to ${quickSelectedPlayers.length} player${quickSelectedPlayers.length !== 1 ? 's' : ''}?\n\n"${quickSmsText.substring(0, 100)}${quickSmsText.length > 100 ? '...' : ''}"`;
    const doSend = async () => {
      setQuickSending(true);
      try {
        const res = await fetch(`${API_URL}/freestyle_sms_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            user_id: userId,
            player_ids: quickSelectedPlayers,
            message: quickSmsText,
            personalize: quickPersonalize,
          }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          haptic.confirm();
          setQuickResults({
            sentCount: data.sent_count,
            failedCount: data.failed_count,
            sentNames: data.sent_names || [],
            failedNames: data.failed_names || [],
          });
          const msg = data.failed_count > 0
            ? `${data.sent_count} delivered, ${data.failed_count} failed.`
            : `${data.sent_count} message${data.sent_count !== 1 ? 's' : ''} delivered!`;
          if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Sent!', msg); }
        } else {
          const failMsg = data.message || 'Failed to send';
          setError(failMsg);
          if (Platform.OS === 'web') { window.alert('Failed: ' + failMsg); } else { Alert.alert('Error', failMsg); }
        }
      } catch (e: any) {
        setError('Network error');
        if (Platform.OS === 'web') { window.alert('Network error'); } else { Alert.alert('Error', 'Network error'); }
      }
      setQuickSending(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) doSend();
    } else {
      Alert.alert('Send SMS', confirmMsg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Send', onPress: doSend }]);
    }
  };

  const resetQuickSms = () => {
    setQuickSmsText('');
    setQuickSelectedPlayers([]);
    setQuickResults(null);
    setQuickPlayerSearch('');
    setError('');
  };

  // Web: keep ref to latest upload function for drag-and-drop
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    uploadFnRef.current = (file: File) => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (allowed.includes(file.type)) uploadFileToServer(file);
      else alert('Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, MOV, or WebM.');
    };
  });

  // Web: page-level drag-and-drop — any file dropped on the Broadcast page gets uploaded
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) setDragging(true);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; setDragging(false); }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && uploadFnRef.current) uploadFnRef.current(file);
    };

    window.addEventListener('dragenter', handleDragEnter as any);
    window.addEventListener('dragover', handleDragOver as any);
    window.addEventListener('dragleave', handleDragLeave as any);
    window.addEventListener('drop', handleDrop as any);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter as any);
      window.removeEventListener('dragover', handleDragOver as any);
      window.removeEventListener('dragleave', handleDragLeave as any);
      window.removeEventListener('drop', handleDrop as any);
    };
  }, []);

  // Init schema once
  useEffect(() => {
    fetch(`${API_URL}/broadcast_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'schema' }),
    }).catch(() => {});
  }, []);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      if (userId && isAdmin) {
        loadOverview();
      }
    }, [userId, isAdmin])
  );

  // Load tab data when switching
  useEffect(() => {
    if (!userId || !isAdmin) return;
    switch (activeTab) {
      case 'overview': loadOverview(); break;
      case 'activity': loadActivity(); break;
      case 'engage': loadEngagement(); break;
      case 'users': loadUsers(); break;
      case 'players': loadGroups(); loadLeaderboard(); break;
      case 'groups': loadGroups(); break;
      case 'database': loadTableCounts(); break;
      case 'broadcast': loadBroadcastPlayers(); loadBroadcasts(); break;
    }
  }, [activeTab]);

  // ── Data Loaders ──

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'overview', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') setOverview(data.overview);
    } catch {}
    setLoading(false);
  };

  const loadActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activity', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') setActivity(data.activity);
    } catch {}
    setLoading(false);
  };

  const loadEngagement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'engagement', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') setEngagement(data.engagement);
    } catch {}
    setLoading(false);
  };

  const loadUsers = async (search?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'users', user_id: userId, search: search ?? userSearch }),
      });
      const data = await res.json();
      if (data.status === 'success') setUsers(data.users || []);
    } catch {}
    setLoading(false);
  };

  const loadLeaderboard = async (groupId?: number | null) => {
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leaderboard', user_id: userId, group_id: groupId ?? selectedGroupId }),
      });
      const data = await res.json();
      if (data.status === 'success') setLeaderboardPlayers(data.players || []);
    } catch {}
  };

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'groups', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') setGroups(data.groups || []);
    } catch {}
  };

  const loadTableCounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'table_counts', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') setTableCounts(data.counts || {});
    } catch {}
    setLoading(false);
  };

  // ── Database CRUD ──

  const openTable = async (table: string) => {
    setDbBrowseTable(table);
    setDbPage(1);
    setDbSearch('');
    setDbEditRecord(null);
    setDbAddMode(false);
    setDbLoading(true);
    try {
      const [colRes, rowRes] = await Promise.all([
        fetch(`${API_URL}/admin_api.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'table_columns', user_id: userId, table }),
        }),
        fetch(`${API_URL}/admin_api.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'table_rows', user_id: userId, table, page: 1, per_page: 25 }),
        }),
      ]);
      const colData = await colRes.json();
      const rowData = await rowRes.json();
      if (colData.status === 'success') setDbColumns(colData.columns || []);
      if (rowData.status === 'success') {
        setDbRows(rowData.rows || []);
        setDbTotalPages(rowData.total_pages || 1);
        setDbTotal(rowData.total || 0);
      }
    } catch {}
    setDbLoading(false);
  };

  const loadDbRows = async (page: number, search?: string) => {
    if (!dbBrowseTable) return;
    setDbLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'table_rows', user_id: userId, table: dbBrowseTable, page, per_page: 25, search: search ?? dbSearch }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDbRows(data.rows || []);
        setDbPage(data.page);
        setDbTotalPages(data.total_pages || 1);
        setDbTotal(data.total_filtered ?? data.total ?? 0);
      }
    } catch {}
    setDbLoading(false);
  };

  const handleDbSaveRecord = async () => {
    if (!dbBrowseTable || !dbEditRecord) return;
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_record', user_id: userId, table: dbBrowseTable, record_id: dbEditRecord.id, fields: dbEditFields }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        haptic.confirm();
        setDbEditRecord(null);
        loadDbRows(dbPage);
      } else {
        Alert.alert('Error', data.message || 'Update failed');
      }
    } catch { Alert.alert('Error', 'Network error'); }
  };

  const handleDbDeleteRecord = (recordId: number) => {
    if (!dbBrowseTable) return;
    Alert.alert('Delete Record', `Delete record #${recordId} from ${dbBrowseTable}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/admin_api.php`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete_record', user_id: userId, table: dbBrowseTable, record_id: recordId }),
            });
            const data = await res.json();
            if (data.status === 'success') {
              haptic.confirm();
              loadDbRows(dbPage);
              loadTableCounts();
            }
          } catch {}
        },
      },
    ]);
  };

  const handleDbInsertRecord = async () => {
    if (!dbBrowseTable) return;
    const nonEmpty: Record<string, string> = {};
    for (const [k, v] of Object.entries(dbAddFields)) {
      if (v.trim() !== '') nonEmpty[k] = v.trim();
    }
    if (Object.keys(nonEmpty).length === 0) {
      Alert.alert('Error', 'Fill in at least one field'); return;
    }
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_record', user_id: userId, table: dbBrowseTable, fields: nonEmpty }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        haptic.confirm();
        setDbAddMode(false);
        setDbAddFields({});
        loadDbRows(1);
        loadTableCounts();
      } else {
        Alert.alert('Error', data.message || 'Insert failed');
      }
    } catch { Alert.alert('Error', 'Network error'); }
  };

  // Debounce db search
  useEffect(() => {
    if (activeTab !== 'database' || !dbBrowseTable) return;
    const timer = setTimeout(() => loadDbRows(1, dbSearch), 300);
    return () => clearTimeout(timer);
  }, [dbSearch]);

  const loadBroadcastPlayers = async (searchOverride?: string) => {
    setLoadingPlayers(true);
    try {
      const searchTerm = searchOverride !== undefined ? searchOverride : playerSearch;
      const res = await fetch(`${API_URL}/pool_players_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', user_id: userId, page: 1, per_page: 1000, search_name: searchTerm || undefined }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const players = data.players || [];
        setPoolPlayers(players);
        // Players start deselected — admin chooses who to send to
      }
    } catch {}
    setLoadingPlayers(false);
  };

  const loadBroadcasts = async () => {
    try {
      const res = await fetch(`${API_URL}/broadcast_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', user_id: userId }),
      });
      const data = await res.json();
      if (data.status === 'success') setBroadcasts(data.broadcasts || []);
    } catch {}
  };

  // ── User search debounce ──
  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => loadUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // ── Broadcast player search debounce ──
  useEffect(() => {
    if (activeTab !== 'broadcast') return;
    const timer = setTimeout(() => loadBroadcastPlayers(playerSearch), 300);
    return () => clearTimeout(timer);
  }, [playerSearch]);

  // ── Admin Actions ──

  const handleUpdateUser = async (targetId: number, updates: Record<string, any>) => {
    try {
      const res = await fetch(`${API_URL}/admin_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_user', user_id: userId, target_user_id: targetId, ...updates }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        haptic.confirm();
        loadUsers();
        setSelectedUser(null);
      }
    } catch {}
  };

  const handleDeleteGroup = async (groupId: number, groupName: string) => {
    Alert.alert('Delete Group', `Delete "${groupName}" and all its matches/players?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/admin_api.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete_group', user_id: userId, group_id: groupId }),
            });
            haptic.confirm();
            loadGroups();
          } catch {}
        },
      },
    ]);
  };

  // ── Broadcast actions ──

  // ── AI Content Generator ──

  const handleAiGenerate = async () => {
    if (!aiTheme.trim()) { setError('Describe what this broadcast is about'); return; }
    setError('');
    setAiGenerating(true);
    try {
      const res = await fetch(`${API_URL}/ai_generate.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', user_id: userId, theme: aiTheme.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSubject(data.subject || '');
        setSmsText(data.sms_text || '');
        setBodyHtml(data.body_html || '');
        haptic.confirm();
      } else {
        setError(data.message || 'AI generation failed');
      }
    } catch {
      setError('Network error calling AI');
    }
    setAiGenerating(false);
  };

  // Shared: upload a File (web) or RN asset and insert HTML snippet
  const uploadFileToServer = async (file: File | { uri: string; name: string; type: string }) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('user_id', String(userId));
      formData.append('media', file as any);

      const res = await fetch(`${API_URL}/media_upload.php`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.status === 'success') {
        haptic.confirm();
        const isVideo = data.type === 'video';

        // Set as featured image (shown prominently on the landing page)
        setFeaturedImage(data.url);

        // Also add inline HTML in the content body
        const htmlSnippet = isVideo
          ? `\n<video controls playsinline style="width:100%;max-width:720px;border-radius:12px;margin:16px 0"><source src="${data.url}">Your browser does not support video.</video>\n`
          : `\n<img src="${data.url}" alt="" style="width:100%;max-width:720px;border-radius:12px;margin:16px 0">\n`;

        setBodyHtml(prev => prev + htmlSnippet);
        const mediaMsg = `${isVideo ? 'Video' : 'Image'} uploaded! It will be displayed prominently as the hero image on your landing page.${data.width ? ` (${data.width}×${data.height})` : ''}`;
        if (Platform.OS === 'web') { window.alert(mediaMsg); } else { Alert.alert('Media Added', mediaMsg); }
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (e: any) {
      setError('Upload failed: ' + (e.message || 'Network error'));
    }
    setUploading(false);
  };

  // Web: handle file from <input> or drag-and-drop
  const handleWebFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, MOV, or WebM.');
      return;
    }
    uploadFileToServer(file);
  };

  const handleMediaUpload = async () => {
    if (Platform.OS === 'web') {
      // On web: create a temporary file input and click it
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) handleWebFile(file);
      };
      input.click();
      return;
    }

    // On native: use ImagePicker
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your photo library to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split('/').pop() || 'upload.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const isVideo = asset.type === 'video' || ['mp4', 'mov', 'webm'].includes(ext);
    const mimeType = isVideo
      ? (ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4')
      : (ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

    uploadFileToServer({ uri, name: filename, type: mimeType });
  };

  const togglePlayer = (id: number) => {
    haptic.tap();
    setSelectedPlayers(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  // Save or update the draft in the DB so we can preview the real landing page
  const saveDraft = async (): Promise<{ id: number; code: string } | null> => {
    try {
      if (draftId && draftCode) {
        // Update existing draft
        await fetch(`${API_URL}/broadcast_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            user_id: userId,
            broadcast_id: draftId,
            subject,
            body_html: bodyHtml,
            sms_text: smsText,
            featured_image: featuredImage,
          }),
        });
        return { id: draftId, code: draftCode };
      } else {
        // Create new draft
        const res = await fetch(`${API_URL}/broadcast_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', user_id: userId, subject, body_html: bodyHtml, sms_text: smsText, featured_image: featuredImage }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          setDraftId(data.broadcast_id);
          setDraftCode(data.broadcast_code);
          return { id: data.broadcast_id, code: data.broadcast_code };
        } else {
          setError(data.message || 'Failed to save draft');
          return null;
        }
      }
    } catch {
      setError('Network error saving draft');
      return null;
    }
  };

  // Preview: save draft then open real landing page in browser
  const handlePreviewLandingPage = async () => {
    if (!subject.trim()) { setError('Subject is required to preview'); return; }
    if (!bodyHtml.trim()) { setError('Message body is required to preview'); return; }
    setError('');
    setPreviewing(true);

    const draft = await saveDraft();
    if (draft) {
      const previewUrl = `https://peoplestar.com/PlayPBNow/broadcast.html?code=${draft.code}`;
      Linking.openURL(previewUrl);
    }
    setPreviewing(false);
  };

  const handleSendBroadcast = async () => {
    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!bodyHtml.trim()) { setError('Message body is required'); return; }
    if (!smsText.trim()) { setError('SMS text is required'); return; }
    if (selectedPlayers.length === 0) { setError('Select at least one recipient'); return; }
    setError('');

    if (Platform.OS === 'web') {
      const ok = window.confirm(`Send SMS to ${selectedPlayers.length} player${selectedPlayers.length !== 1 ? 's' : ''}?\n\nSMS: "${smsText.substring(0, 80)}${smsText.length > 80 ? '...' : ''}"`);
      if (ok) doSendBroadcast();
    } else {
      Alert.alert('Send Broadcast', `Send SMS to ${selectedPlayers.length} players?\n\nSMS: "${smsText.substring(0, 80)}${smsText.length > 80 ? '...' : ''}"`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: doSendBroadcast },
      ]);
    }
  };

  const doSendBroadcast = async () => {
    setSending(true);
    try {
      // Save/update draft first so any last-minute edits are captured
      const draft = await saveDraft();
      if (!draft) { setSending(false); return; }

      const sendRes = await fetch(`${API_URL}/broadcast_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', user_id: userId, broadcast_id: draft.id, player_ids: selectedPlayers }),
      });
      const sendData = await sendRes.json();
      if (sendData.status === 'success') {
        haptic.confirm();
        setSendResults({
          sentCount: sendData.sent_count,
          failedCount: sendData.failed_count,
          broadcastCode: draft.code!,
          sentNames: sendData.sent_names || [],
          failedNames: sendData.failed_names || [],
        });
        loadBroadcasts();

        // Immediate confirmation alert
        const msg = sendData.failed_count > 0
          ? `${sendData.sent_count} delivered, ${sendData.failed_count} failed.\n\nDelivered to: ${(sendData.sent_names || []).join(', ')}\n\nFailed: ${(sendData.failed_names || []).join(', ')}`
          : `${sendData.sent_count} message${sendData.sent_count !== 1 ? 's' : ''} delivered successfully to: ${(sendData.sent_names || []).join(', ')}`;
        const title = sendData.failed_count > 0 ? 'Broadcast Sent (With Issues)' : 'Broadcast Sent!';
        if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); } else { Alert.alert(title, msg); }
      } else {
        const failMsg = sendData.message || 'Failed to send broadcast. Please try again.';
        setError(failMsg);
        if (Platform.OS === 'web') { window.alert('Send Failed\n\n' + failMsg); } else { Alert.alert('Send Failed', failMsg); }
      }
    } catch (e: any) {
      const errMsg = 'Network error: ' + (e.message || 'Could not reach server');
      setError(errMsg);
      if (Platform.OS === 'web') { window.alert('Send Failed\n\n' + errMsg); } else { Alert.alert('Send Failed', errMsg); }
    }
    setSending(false);
  };

  const resetBroadcast = () => {
    setSubject(''); setBodyHtml(''); setSmsText('');
    setSelectedPlayers([]);
    setFeaturedImage('');
    setSendResults(null); setError(''); setShowPreview(false);
    setDraftId(null); setDraftCode(null);
  };

  const handleDeleteBroadcast = (broadcastId: number, subject: string) => {
    const doDelete = async () => {
      try {
        const res = await fetch(`${API_URL}/broadcast_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', user_id: userId, broadcast_id: broadcastId }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          haptic.confirm();
          const filesMsg = data.deleted_files?.length ? `\n\n${data.deleted_files.length} media file${data.deleted_files.length !== 1 ? 's' : ''} cleaned up.` : '';
          if (Platform.OS === 'web') { window.alert('Broadcast deleted.' + filesMsg); } else { Alert.alert('Deleted', 'Broadcast deleted.' + filesMsg); }
          loadBroadcasts();
        } else {
          const errMsg = data.message || 'Delete failed';
          if (Platform.OS === 'web') { window.alert(errMsg); } else { Alert.alert('Error', errMsg); }
        }
      } catch {
        if (Platform.OS === 'web') { window.alert('Network error'); } else { Alert.alert('Error', 'Network error'); }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete broadcast "${subject}"?\n\nThis will also delete all associated media files from the server.`)) doDelete();
    } else {
      Alert.alert('Delete Broadcast', `Delete "${subject}"?\n\nThis will also delete all associated media files.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ── Helpers ──

  const fmtDate = (d: string) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtDateTime = (d: string) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const timeAgo = (d: string) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ── Non-admin gate ──
  if (!isAdmin) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.gateView}>
          <BrandedIcon name="lock" size={48} color={colors.accent} />
          <Text style={s.gateTitle}>Admin Only</Text>
          <Text style={s.gateSubtitle}>This feature is restricted to administrators.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Tab Buttons ──

  const TABS: { key: DashTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'home' },
    { key: 'activity', label: 'Activity', icon: 'flash' },
    { key: 'engage', label: 'Engage', icon: 'star' },
    { key: 'users', label: 'Users', icon: 'groups' },
    { key: 'players', label: 'Players', icon: 'players' },
    { key: 'groups', label: 'Groups', icon: 'layers' },
    { key: 'database', label: 'Database', icon: 'stats' },
    { key: 'broadcast', label: 'Broadcast', icon: 'send' },
  ];

  // ── Render ──

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>ADMIN</Text>
        <View style={s.adminBadge}>
          <Text style={s.adminBadgeText}>DASHBOARD</Text>
        </View>
      </View>

      {/* Tab Scroller */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroller}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabChip, activeTab === tab.key && s.tabChipActive]}
            onPress={() => { setActiveTab(tab.key); setError(''); }}
          >
            <BrandedIcon name={tab.icon} size={14} color={activeTab === tab.key ? colors.accent : colors.textMuted} />
            <Text style={[s.tabChipText, activeTab === tab.key && s.tabChipTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ════════ OVERVIEW ════════ */}
      {activeTab === 'overview' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {loading && !overview ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : overview ? (
            <>
              {/* Users Section */}
              <Text style={s.sectionLabel}>USERS</Text>
              <View style={s.statGrid}>
                <StatCard s={s} colors={colors} label="Total Users" value={overview.users.total} />
                <StatCard s={s} colors={colors} label="Active Trials" value={overview.users.active_trials} accent />
                <StatCard s={s} colors={colors} label="Subscribed" value={overview.users.active_subscriptions} accent />
                <StatCard s={s} colors={colors} label="Expired" value={overview.users.expired} />
              </View>

              <Text style={s.sectionLabel}>PLAYER POOL</Text>
              <View style={s.statGrid}>
                <StatCard s={s} colors={colors} label="Total Pool" value={overview.pool_players.total} accent />
                <StatCard s={s} colors={colors} label="Migrated (PBPM)" value={overview.pool_players.migrated} />
                <StatCard s={s} colors={colors} label="New Signups" value={overview.pool_players.new_signups} accent />
              </View>

              <Text style={s.sectionLabel}>SCORING</Text>
              <View style={s.statGrid}>
                <StatCard s={s} colors={colors} label="Players" value={overview.scoring.players} />
                <StatCard s={s} colors={colors} label="Groups" value={overview.scoring.groups} />
                <StatCard s={s} colors={colors} label="Matches" value={overview.scoring.matches} accent />
                <StatCard s={s} colors={colors} label="Sessions" value={overview.scoring.sessions} />
                <StatCard s={s} colors={colors} label="Live Collabs" value={overview.scoring.active_collab} accent />
              </View>

              <Text style={s.sectionLabel}>INVITES</Text>
              <View style={s.statGrid}>
                <StatCard s={s} colors={colors} label="Total Invites" value={overview.invites.total} />
                <StatCard s={s} colors={colors} label="Active" value={overview.invites.active} accent />
                <StatCard s={s} colors={colors} label="Responses" value={overview.invites.responses} />
                <StatCard s={s} colors={colors} label="Confirmed" value={overview.invites.confirmed} accent />
              </View>

              <Text style={s.sectionLabel}>BROADCASTS & SMS</Text>
              <View style={s.statGrid}>
                <StatCard s={s} colors={colors} label="Broadcasts" value={overview.broadcasts.total} />
                <StatCard s={s} colors={colors} label="SMS Sent" value={overview.broadcasts.sms_sent} accent />
                <StatCard s={s} colors={colors} label="Credits In System" value={overview.sms_credits.in_system} />
                <StatCard s={s} colors={colors} label="Credits Purchased" value={overview.sms_credits.purchased} accent />
                <StatCard s={s} colors={colors} label="Credits Used" value={overview.sms_credits.used} />
              </View>

              <Text style={s.sectionLabel}>COURTS</Text>
              <View style={s.statGrid}>
                <StatCard s={s} colors={colors} label="Total Courts" value={overview.courts} accent />
              </View>

              <TouchableOpacity style={s.refreshBtn} onPress={loadOverview}>
                <BrandedIcon name="refresh" size={16} color={colors.accent} />
                <Text style={s.refreshBtnText}>Refresh Data</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </>
          ) : null}
        </ScrollView>
      )}

      {/* ════════ ACTIVITY ════════ */}
      {activeTab === 'activity' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {loading && !activity ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : activity ? (
            <>
              {/* Active Live Sessions */}
              {activity.active_collabs.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>LIVE SESSIONS NOW</Text>
                  {activity.active_collabs.map((cs: any) => (
                    <View key={cs.id} style={[s.activityCard, { borderLeftColor: colors.accent, borderLeftWidth: 3 }]}>
                      <View style={s.activityRow}>
                        <Text style={s.activityTitle}>{cs.group_name || 'Session'}</Text>
                        <Text style={[s.activityBadge, { color: colors.accent }]}>LIVE</Text>
                      </View>
                      <Text style={s.activityMeta}>Code: {cs.share_code} · {cs.participants} participants</Text>
                      <Text style={s.activityTime}>Started {timeAgo(cs.created_at)}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Recent Users */}
              <Text style={s.sectionLabel}>RECENT USER SIGNUPS</Text>
              {activity.recent_users.map((u: any) => (
                <View key={u.id} style={s.activityCard}>
                  <View style={s.activityRow}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={[s.subBadge,
                      u.subscription_status === 'trial' && { backgroundColor: 'rgba(255,210,63,0.15)', color: colors.gold },
                      u.subscription_status === 'active' && { backgroundColor: 'rgba(135,202,55,0.15)', color: colors.accent },
                    ]}>{u.subscription_status || 'none'}</Text>
                  </View>
                  <Text style={s.activityMeta}>{u.phone || 'No phone'}</Text>
                  <Text style={s.activityTime}>
                    Joined {fmtDate(u.created_at)}
                    {u.last_login_at ? ` · Last login ${timeAgo(u.last_login_at)}` : ' · Never logged in'}
                  </Text>
                </View>
              ))}

              {/* Recent Sessions */}
              <Text style={s.sectionLabel}>RECENT SCORING SESSIONS</Text>
              {activity.recent_sessions.map((sess: any) => (
                <View key={sess.id} style={s.activityCard}>
                  <View style={s.activityRow}>
                    <Text style={s.activityTitle}>{sess.title || 'Untitled Session'}</Text>
                    <Text style={s.activityBadge}>{sess.player_count || 0}P</Text>
                  </View>
                  <Text style={s.activityMeta}>
                    By {sess.first_name || 'Unknown'} {sess.last_name || ''} · Code: {sess.share_code || 'N/A'}
                  </Text>
                  <Text style={s.activityTime}>{fmtDateTime(sess.created_at)}</Text>
                </View>
              ))}

              {/* Recent Invites */}
              <Text style={s.sectionLabel}>RECENT INVITES SENT</Text>
              {activity.recent_invites.map((inv: any) => (
                <View key={inv.id} style={s.activityCard}>
                  <View style={s.activityRow}>
                    <Text style={s.activityTitle}>{inv.court_name}</Text>
                    <Text style={[s.subBadge,
                      inv.status === 'active' && { backgroundColor: 'rgba(135,202,55,0.15)', color: colors.accent },
                      inv.status === 'cancelled' && { backgroundColor: 'rgba(255,71,87,0.15)', color: colors.danger },
                    ]}>{inv.status}</Text>
                  </View>
                  <Text style={s.activityMeta}>
                    By {inv.first_name || 'Unknown'} · {inv.response_count} responses ({inv.confirmed_count} confirmed)
                  </Text>
                  <Text style={s.activityTime}>{fmtDateTime(inv.created_at)}</Text>
                </View>
              ))}

              {/* New Pool Signups */}
              <Text style={s.sectionLabel}>NEW POOL PLAYER SIGNUPS</Text>
              {activity.recent_pool_signups.length === 0 && (
                <Text style={s.emptyText}>No new signups yet</Text>
              )}
              {activity.recent_pool_signups.map((p: any) => (
                <View key={p.id} style={s.activityCard}>
                  <Text style={s.activityTitle}>{p.first_name} {p.last_name}</Text>
                  <Text style={s.activityMeta}>Level: {p.play_level || 'N/A'} · {p.cities_to_play || 'No city'}</Text>
                  <Text style={s.activityTime}>{fmtDateTime(p.created_at)}</Text>
                </View>
              ))}

              {/* SMS Purchases */}
              <Text style={s.sectionLabel}>RECENT SMS CREDIT PURCHASES</Text>
              {activity.recent_purchases.length === 0 && (
                <Text style={s.emptyText}>No purchases yet</Text>
              )}
              {activity.recent_purchases.map((p: any) => (
                <View key={p.id} style={s.activityCard}>
                  <View style={s.activityRow}>
                    <Text style={s.activityTitle}>{p.first_name || ''} {p.last_name || ''}</Text>
                    <Text style={[s.activityBadge, { color: colors.accent }]}>+{p.credits_changed}</Text>
                  </View>
                  <Text style={s.activityMeta}>{p.reason}</Text>
                  <Text style={s.activityTime}>{fmtDateTime(p.created_at)}</Text>
                </View>
              ))}

              <TouchableOpacity style={s.refreshBtn} onPress={loadActivity}>
                <BrandedIcon name="refresh" size={16} color={colors.accent} />
                <Text style={s.refreshBtnText}>Refresh Activity</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </>
          ) : null}
        </ScrollView>
      )}

      {/* ════════ ENGAGEMENT ════════ */}
      {activeTab === 'engage' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {loading && !engagement ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : engagement ? (
            <>
              {/* Top Logins */}
              <Text style={s.sectionLabel}>TOP USERS BY LOGIN COUNT</Text>
              {engagement.top_logins.map((u: any, i: number) => (
                <View key={u.id} style={s.engageRow}>
                  <Text style={s.engageRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={s.activityMeta}>{u.phone || 'N/A'}</Text>
                  </View>
                  <View style={s.engageStats}>
                    <Text style={s.engageNum}>{u.login_count}</Text>
                    <Text style={s.engageLabel}>logins</Text>
                  </View>
                  <Text style={s.activityTime}>{u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}</Text>
                </View>
              ))}

              {/* Top Inviters */}
              <Text style={s.sectionLabel}>TOP INVITE SENDERS</Text>
              {engagement.top_inviters.map((u: any, i: number) => (
                <View key={u.id} style={s.engageRow}>
                  <Text style={s.engageRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={s.activityMeta}>{u.phone || 'N/A'}</Text>
                  </View>
                  <View style={s.engageStats}>
                    <Text style={s.engageNum}>{u.invite_count}</Text>
                    <Text style={s.engageLabel}>invites</Text>
                  </View>
                  <Text style={s.activityTime}>{u.last_invite_at ? timeAgo(u.last_invite_at) : ''}</Text>
                </View>
              ))}

              {/* Top Acceptors */}
              <Text style={s.sectionLabel}>TOP INVITE ACCEPTORS (POOL PLAYERS)</Text>
              {engagement.top_acceptors.map((p: any, i: number) => (
                <View key={p.id} style={s.engageRow}>
                  <Text style={s.engageRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{p.first_name} {p.last_name}</Text>
                    <Text style={s.activityMeta}>{p.play_level || 'N/A'} · {p.cities_to_play || 'N/A'}</Text>
                  </View>
                  <View style={s.engageStats}>
                    <Text style={[s.engageNum, { color: colors.accent }]}>{p.confirmed_count}</Text>
                    <Text style={s.engageLabel}>confirmed</Text>
                  </View>
                  <View style={s.engageStats}>
                    <Text style={s.engageNum}>{p.total_invites_received}</Text>
                    <Text style={s.engageLabel}>total</Text>
                  </View>
                </View>
              ))}

              {/* Top Beacon Creators */}
              <Text style={s.sectionLabel}>TOP BEACON / SESSION CREATORS</Text>
              {engagement.top_beacon_creators.map((u: any, i: number) => (
                <View key={u.id} style={s.engageRow}>
                  <Text style={s.engageRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={s.activityMeta}>{u.phone || 'N/A'}</Text>
                  </View>
                  <View style={s.engageStats}>
                    <Text style={s.engageNum}>{u.session_count}</Text>
                    <Text style={s.engageLabel}>sessions</Text>
                  </View>
                  <Text style={s.activityTime}>{u.last_session_at ? timeAgo(u.last_session_at) : ''}</Text>
                </View>
              ))}

              {/* Top Collab Users */}
              <Text style={s.sectionLabel}>TOP COLLAB PARTICIPANTS</Text>
              {engagement.top_collab_users.map((u: any, i: number) => (
                <View key={u.id} style={s.engageRow}>
                  <Text style={s.engageRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={s.activityMeta}>{u.phone || 'N/A'}</Text>
                  </View>
                  <View style={s.engageStats}>
                    <Text style={s.engageNum}>{u.collab_count}</Text>
                    <Text style={s.engageLabel}>collabs</Text>
                  </View>
                </View>
              ))}

              {/* Never Returned */}
              <Text style={s.sectionLabel}>USERS WHO NEVER RETURNED</Text>
              {engagement.never_returned.map((u: any) => (
                <View key={u.id} style={[s.engageRow, { borderLeftColor: colors.danger, borderLeftWidth: 3 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={s.activityMeta}>{u.phone || 'N/A'} · {u.subscription_status || 'none'}</Text>
                  </View>
                  <Text style={s.activityTime}>Joined {fmtDate(u.created_at)}</Text>
                </View>
              ))}

              <TouchableOpacity style={s.refreshBtn} onPress={loadEngagement}>
                <BrandedIcon name="refresh" size={16} color={colors.accent} />
                <Text style={s.refreshBtnText}>Refresh Engagement</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </>
          ) : null}
        </ScrollView>
      )}

      {/* ════════ USERS ════════ */}
      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <View style={s.searchContainer}>
              <BrandedIcon name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                value={userSearch}
                onChangeText={setUserSearch}
                placeholder="Search by name, phone, email..."
                placeholderTextColor={colors.inputPlaceholder}
              />
              {userSearch ? (
                <TouchableOpacity onPress={() => setUserSearch('')}>
                  <BrandedIcon name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <FlatList
            data={users}
            keyExtractor={u => u.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: u }) => (
              <TouchableOpacity
                style={s.userCard}
                onPress={() => setSelectedUser(u)}
              >
                <View style={s.activityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{u.first_name || ''} {u.last_name || ''}</Text>
                    <Text style={s.activityMeta}>{u.phone || 'No phone'} · {u.email || 'No email'}</Text>
                  </View>
                  <View>
                    <Text style={[s.subBadge,
                      u.subscription_status === 'trial' && { backgroundColor: 'rgba(255,210,63,0.15)', color: colors.gold },
                      u.subscription_status === 'active' && { backgroundColor: 'rgba(135,202,55,0.15)', color: colors.accent },
                    ]}>{u.subscription_status || 'none'}</Text>
                  </View>
                </View>
                <Text style={s.activityTime}>
                  Joined {fmtDate(u.created_at)}
                  {u.last_login_at ? ` · Last login ${timeAgo(u.last_login_at)}` : ''}
                  {u.is_admin ? ' · ADMIN' : ''}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              loading ? <ActivityIndicator size="large" color={colors.accent} /> :
              <Text style={s.emptyText}>No users found</Text>
            }
          />

          {/* User Detail Modal */}
          <Modal visible={!!selectedUser} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>User Details</Text>
                  <TouchableOpacity onPress={() => setSelectedUser(null)}>
                    <BrandedIcon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {selectedUser && (
                  <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={s.detailName}>{selectedUser.first_name} {selectedUser.last_name}</Text>
                    <DetailRow s={s} colors={colors} label="Phone" value={selectedUser.phone || 'N/A'} />
                    <DetailRow s={s} colors={colors} label="Email" value={selectedUser.email || 'N/A'} />
                    <DetailRow s={s} colors={colors} label="Status" value={selectedUser.subscription_status || 'none'} />
                    <DetailRow s={s} colors={colors} label="Tier" value={selectedUser.subscription_tier || 'free'} />
                    <DetailRow s={s} colors={colors} label="Trial Start" value={fmtDate(selectedUser.trial_start_date)} />
                    <DetailRow s={s} colors={colors} label="Sub End" value={fmtDate(selectedUser.subscription_end_date)} />
                    <DetailRow s={s} colors={colors} label="Last Login" value={selectedUser.last_login_at ? fmtDateTime(selectedUser.last_login_at) : 'Never'} />
                    <DetailRow s={s} colors={colors} label="Joined" value={fmtDateTime(selectedUser.created_at)} />
                    <DetailRow s={s} colors={colors} label="Admin" value={selectedUser.is_admin ? 'Yes' : 'No'} />

                    <Text style={[s.sectionLabel, { marginTop: 24 }]}>ACTIONS</Text>

                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: 'rgba(135,202,55,0.12)' }]}
                      onPress={() => handleUpdateUser(selectedUser.id, { subscription_status: 'active', subscription_tier: 'pro' })}
                    >
                      <Text style={[s.actionBtnText, { color: colors.accent }]}>Grant Pro Access</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: 'rgba(255,210,63,0.12)' }]}
                      onPress={() => handleUpdateUser(selectedUser.id, { subscription_status: 'trial' })}
                    >
                      <Text style={[s.actionBtnText, { color: colors.gold }]}>Reset to Trial</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: 'rgba(255,71,87,0.12)' }]}
                      onPress={() => handleUpdateUser(selectedUser.id, { subscription_status: 'expired', subscription_tier: 'free' })}
                    >
                      <Text style={[s.actionBtnText, { color: colors.danger }]}>Revoke Access</Text>
                    </TouchableOpacity>

                    {!selectedUser.is_admin && (
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => {
                          Alert.alert('Make Admin?', 'This will give full admin access.', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Confirm', onPress: () => handleUpdateUser(selectedUser.id, { is_admin: 1 }) },
                          ]);
                        }}
                      >
                        <Text style={s.actionBtnText}>Make Admin</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* ════════ PLAYERS ════════ */}
      {activeTab === 'players' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={s.sectionLabel}>FILTER BY GROUP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={[s.filterChip, !selectedGroupId && s.filterChipActive]}
              onPress={() => { setSelectedGroupId(null); loadLeaderboard(null); }}
            >
              <Text style={[s.filterChipText, !selectedGroupId && s.filterChipTextActive]}>All Groups</Text>
            </TouchableOpacity>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[s.filterChip, selectedGroupId === g.id && s.filterChipActive]}
                onPress={() => { setSelectedGroupId(g.id); loadLeaderboard(g.id); }}
              >
                <Text style={[s.filterChipText, selectedGroupId === g.id && s.filterChipTextActive]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.sectionLabel}>LEADERBOARD ({leaderboardPlayers.length})</Text>
          {leaderboardPlayers.map((p, i) => (
            <View key={p.id} style={s.leaderboardRow}>
              <Text style={s.leaderboardRank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.activityTitle}>{p.first_name} {p.last_name}</Text>
                <Text style={s.activityMeta}>
                  {p.group_name || 'No group'} · {p.gender || 'N/A'}
                  {p.dupr_rating ? ` · DUPR: ${p.dupr_rating}` : ''}
                </Text>
              </View>
              <View style={s.wlBox}>
                <Text style={[s.wlText, { color: colors.accent }]}>{p.wins}W</Text>
                <Text style={[s.wlText, { color: colors.danger }]}>{p.losses}L</Text>
                <Text style={s.wlPct}>{p.win_pct ? `${(p.win_pct * 100).toFixed(0)}%` : '—'}</Text>
              </View>
            </View>
          ))}
          {leaderboardPlayers.length === 0 && <Text style={s.emptyText}>No players found</Text>}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ════════ GROUPS ════════ */}
      {activeTab === 'groups' && (
        <FlatList
          data={groups}
          keyExtractor={g => g.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: g }) => (
            <View style={s.groupCard}>
              <View style={s.activityRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.activityTitle}>{g.name}</Text>
                  <Text style={s.activityMeta}>
                    Owner: {g.owner_first || ''} {g.owner_last || ''} ({g.owner_phone || 'N/A'})
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDeleteGroup(g.id, g.name)}
                >
                  <BrandedIcon name="trash" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={s.groupStats}>
                <Text style={s.groupStat}>{g.player_count} players</Text>
                <Text style={s.groupStat}>{g.match_count} matches</Text>
                <Text style={s.groupStat}>{fmtDate(g.created_at)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={s.emptyText}>No groups found</Text>}
        />
      )}

      {/* ════════ DATABASE ════════ */}
      {activeTab === 'database' && !dbBrowseTable && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {loading && Object.keys(tableCounts).length === 0 ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              <Text style={s.sectionLabel}>TAP A TABLE TO BROWSE RECORDS</Text>
              {Object.entries(tableCounts).map(([table, count]) => (
                <TouchableOpacity key={table} style={s.tableRow} onPress={() => openTable(table)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <BrandedIcon name="stats" size={14} color={colors.textMuted} />
                    <Text style={s.tableName}>{table}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.tableCount, count > 0 && { color: colors.accent }]}>{count.toLocaleString()}</Text>
                    <BrandedIcon name="forward" size={12} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.refreshBtn} onPress={loadTableCounts}>
                <BrandedIcon name="refresh" size={16} color={colors.accent} />
                <Text style={s.refreshBtnText}>Refresh Counts</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      )}

      {/* ════════ DATABASE — TABLE BROWSER ════════ */}
      {activeTab === 'database' && dbBrowseTable && (
        <>
          {/* Table header bar */}
          <View style={[s.subTabBar, { paddingBottom: 8, alignItems: 'center' }]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => { setDbBrowseTable(null); setDbRows([]); setDbColumns([]); setDbEditRecord(null); setDbAddMode(false); loadTableCounts(); }}
            >
              <BrandedIcon name="back" size={16} color={colors.accent} />
              <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 13, color: colors.accent }}>Tables</Text>
            </TouchableOpacity>
            <Text style={[s.sectionTitle, { flex: 1, textAlign: 'center' }]}>{dbBrowseTable}</Text>
            <Text style={{ fontFamily: FONT_BODY_MEDIUM, fontSize: 12, color: colors.textMuted }}>{dbTotal} rows</Text>
          </View>

          {/* Search bar */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={s.searchContainer}>
              <BrandedIcon name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder={`Search ${dbBrowseTable}...`}
                placeholderTextColor={colors.textMuted}
                value={dbSearch}
                onChangeText={setDbSearch}
              />
              {dbSearch !== '' && (
                <TouchableOpacity onPress={() => setDbSearch('')}>
                  <BrandedIcon name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
            <TouchableOpacity
              style={[s.bulkBtn, { backgroundColor: 'rgba(135,202,55,0.12)' }]}
              onPress={() => {
                setDbAddMode(true);
                setDbAddFields({});
                setDbEditRecord(null);
              }}
            >
              <BrandedIcon name="add" size={14} color={colors.accent} />
              <Text style={[s.bulkBtnText, { color: colors.accent }]}>Add Record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.bulkBtn} onPress={() => loadDbRows(dbPage)}>
              <BrandedIcon name="refresh" size={14} color={colors.textMuted} />
              <Text style={[s.bulkBtnText, { color: colors.textMuted }]}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {dbLoading && dbRows.length === 0 ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={dbRows}
              keyExtractor={(item, idx) => `${item.id ?? idx}`}
              contentContainerStyle={{ padding: 16, paddingTop: 0 }}
              renderItem={({ item: row }) => {
                const displayCols = dbColumns.slice(0, 4);
                return (
                  <TouchableOpacity
                    style={s.activityCard}
                    onPress={() => {
                      setDbEditRecord(row);
                      const fields: Record<string, string> = {};
                      dbColumns.forEach(c => { fields[c.Field] = row[c.Field] != null ? String(row[c.Field]) : ''; });
                      setDbEditFields(fields);
                      setDbAddMode(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: colors.accent }}>#{row.id}</Text>
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => handleDbDeleteRecord(row.id)}
                      >
                        <BrandedIcon name="trash" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                    {displayCols.filter(c => c.Field !== 'id').map(c => (
                      <View key={c.Field} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontFamily: FONT_BODY_MEDIUM, fontSize: 12, color: colors.textMuted, flex: 1 }}>{c.Field}</Text>
                        <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.text, flex: 2, textAlign: 'right' }} numberOfLines={1}>
                          {row[c.Field] != null ? String(row[c.Field]) : '—'}
                        </Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={s.emptyText}>{dbSearch ? 'No matching records' : 'Table is empty'}</Text>}
              ListFooterComponent={
                dbTotalPages > 1 ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 }}>
                    <TouchableOpacity
                      disabled={dbPage <= 1}
                      onPress={() => { setDbPage(p => p - 1); loadDbRows(dbPage - 1); }}
                      style={[s.bulkBtn, dbPage <= 1 && { opacity: 0.3 }]}
                    >
                      <Text style={[s.bulkBtnText, { color: colors.accent }]}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={{ fontFamily: FONT_BODY_MEDIUM, fontSize: 13, color: colors.textMuted }}>
                      {dbPage} / {dbTotalPages}
                    </Text>
                    <TouchableOpacity
                      disabled={dbPage >= dbTotalPages}
                      onPress={() => { setDbPage(p => p + 1); loadDbRows(dbPage + 1); }}
                      style={[s.bulkBtn, dbPage >= dbTotalPages && { opacity: 0.3 }]}
                    >
                      <Text style={[s.bulkBtnText, { color: colors.accent }]}>Next</Text>
                    </TouchableOpacity>
                  </View>
                ) : <View style={{ height: 40 }} />
              }
            />
          )}

          {/* ── EDIT RECORD MODAL ── */}
          {dbEditRecord && (
            <Modal animationType="slide" transparent visible onRequestClose={() => setDbEditRecord(null)}>
              <View style={s.modalOverlay}>
                <View style={s.modalContent}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>Edit #{dbEditRecord.id}</Text>
                    <TouchableOpacity onPress={() => setDbEditRecord(null)}>
                      <BrandedIcon name="close" size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={[s.sectionLabel, { marginTop: 0 }]}>{dbBrowseTable} — RECORD #{dbEditRecord.id}</Text>
                    {dbColumns.filter(c => c.Field !== 'id').map(c => (
                      <View key={c.Field} style={{ marginBottom: 12 }}>
                        <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                          {c.Field} <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 10, color: colors.textMuted }}>({c.Type})</Text>
                        </Text>
                        <TextInput
                          style={s.input}
                          value={dbEditFields[c.Field] ?? ''}
                          onChangeText={val => setDbEditFields(prev => ({ ...prev, [c.Field]: val }))}
                          placeholder={c.Null === 'YES' ? 'NULL' : 'Required'}
                          placeholderTextColor={colors.textMuted}
                          multiline={/text/i.test(c.Type)}
                        />
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[s.sendBtn, { marginBottom: 12 }]}
                      onPress={handleDbSaveRecord}
                    >
                      <BrandedIcon name="checkmark" size={18} color="#0f1b2d" />
                      <Text style={s.sendBtnText}>SAVE CHANGES</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: 'rgba(255,71,87,0.1)', borderColor: 'rgba(255,71,87,0.3)' }]}
                      onPress={() => { setDbEditRecord(null); handleDbDeleteRecord(dbEditRecord.id); }}
                    >
                      <Text style={[s.actionBtnText, { color: colors.danger }]}>DELETE THIS RECORD</Text>
                    </TouchableOpacity>
                    <View style={{ height: 60 }} />
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

          {/* ── ADD RECORD MODAL ── */}
          {dbAddMode && (
            <Modal animationType="slide" transparent visible onRequestClose={() => setDbAddMode(false)}>
              <View style={s.modalOverlay}>
                <View style={s.modalContent}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>New {dbBrowseTable} Record</Text>
                    <TouchableOpacity onPress={() => setDbAddMode(false)}>
                      <BrandedIcon name="close" size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={[s.sectionLabel, { marginTop: 0 }]}>FILL IN FIELDS (leave blank to skip)</Text>
                    {dbColumns.filter(c => c.Field !== 'id').map(c => (
                      <View key={c.Field} style={{ marginBottom: 12 }}>
                        <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                          {c.Field} <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 10, color: colors.textMuted }}>({c.Type}){c.Null === 'NO' ? ' *' : ''}</Text>
                        </Text>
                        <TextInput
                          style={s.input}
                          value={dbAddFields[c.Field] ?? ''}
                          onChangeText={val => setDbAddFields(prev => ({ ...prev, [c.Field]: val }))}
                          placeholder={c.Default != null ? `Default: ${c.Default}` : (c.Null === 'YES' ? 'Optional' : 'Required')}
                          placeholderTextColor={colors.textMuted}
                          multiline={/text/i.test(c.Type)}
                        />
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[s.sendBtn, { marginBottom: 12 }]}
                      onPress={handleDbInsertRecord}
                    >
                      <BrandedIcon name="add" size={18} color="#0f1b2d" />
                      <Text style={s.sendBtnText}>INSERT RECORD</Text>
                    </TouchableOpacity>
                    <View style={{ height: 60 }} />
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}
        </>
      )}

      {/* ════════ BROADCAST ════════ */}
      {activeTab === 'broadcast' && (
        <>
          {/* Broadcast sub-tabs */}
          <View style={s.subTabBar}>
            {(['quicksms', 'compose', 'history'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.subTab, broadcastTab === tab && s.subTabActive]}
                onPress={() => setBroadcastTab(tab)}
              >
                <Text style={[s.subTabText, broadcastTab === tab && s.subTabTextActive]}>
                  {tab === 'quicksms' ? 'Quick SMS' : tab === 'compose' ? 'Broadcast' : 'History'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Send Results */}
          {sendResults ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <View style={s.resultsView}>
                <View style={s.resultsIcon}>
                  <BrandedIcon name="checkmark" size={48} color={sendResults.failedCount > 0 ? '#f78c6b' : colors.accent} />
                </View>
                <Text style={s.resultsTitle}>
                  {sendResults.failedCount === 0 ? 'Broadcast Sent Successfully!' : 'Broadcast Sent (With Issues)'}
                </Text>
                <Text style={s.resultsSubtitle}>
                  {sendResults.sentCount} message{sendResults.sentCount !== 1 ? 's' : ''} delivered
                  {sendResults.failedCount > 0 ? `, ${sendResults.failedCount} failed` : ''}
                </Text>

                {/* Sent names */}
                {sendResults.sentNames.length > 0 && (
                  <View style={[s.resultsCard, { marginTop: 16 }]}>
                    <Text style={[s.resultsLabel, { color: colors.accent }]}>DELIVERED TO</Text>
                    <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                      {sendResults.sentNames.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Failed names */}
                {sendResults.failedNames.length > 0 && (
                  <View style={[s.resultsCard, { marginTop: 12, borderColor: 'rgba(255,71,87,0.3)' }]}>
                    <Text style={[s.resultsLabel, { color: '#ff4757' }]}>FAILED</Text>
                    <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: '#ff6b7a', lineHeight: 22 }}>
                      {sendResults.failedNames.join(', ')}
                    </Text>
                  </View>
                )}

                <View style={[s.resultsCard, { marginTop: 16 }]}>
                  <Text style={s.resultsLabel}>LANDING PAGE</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`https://peoplestar.com/PlayPBNow/broadcast.html?code=${sendResults.broadcastCode}`)}>
                    <Text style={s.resultsLink} numberOfLines={2}>
                      https://peoplestar.com/PlayPBNow/broadcast.html?code={sendResults.broadcastCode}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.primaryBtn} onPress={resetBroadcast}>
                  <Text style={s.primaryBtnText}>NEW BROADCAST</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : broadcastTab === 'quicksms' ? (
            /* ════════ QUICK SMS ════════ */
            quickResults ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                <View style={s.resultsView}>
                  <View style={s.resultsIcon}>
                    <BrandedIcon name="checkmark" size={48} color={quickResults.failedCount > 0 ? '#f78c6b' : colors.accent} />
                  </View>
                  <Text style={s.resultsTitle}>
                    {quickResults.failedCount === 0 ? 'Messages Sent!' : 'Sent (With Issues)'}
                  </Text>
                  <Text style={s.resultsSubtitle}>
                    {quickResults.sentCount} delivered{quickResults.failedCount > 0 ? `, ${quickResults.failedCount} failed` : ''}
                  </Text>
                  {quickResults.sentNames.length > 0 && (
                    <View style={[s.resultsCard, { marginTop: 16 }]}>
                      <Text style={[s.resultsLabel, { color: colors.accent }]}>DELIVERED TO</Text>
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                        {quickResults.sentNames.join(', ')}
                      </Text>
                    </View>
                  )}
                  {quickResults.failedNames.length > 0 && (
                    <View style={[s.resultsCard, { marginTop: 12, borderColor: 'rgba(255,71,87,0.3)' }]}>
                      <Text style={[s.resultsLabel, { color: '#ff4757' }]}>FAILED</Text>
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: '#ff6b7a', lineHeight: 22 }}>
                        {quickResults.failedNames.join(', ')}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity style={s.primaryBtn} onPress={resetQuickSms}>
                    <Text style={s.primaryBtnText}>SEND ANOTHER</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                <Text style={s.inputLabel}>YOUR MESSAGE</Text>
                <Text style={s.inputHint}>
                  Type your freestyle message. No landing page — just a direct text.
                  {quickPersonalize ? ' First names auto-prepended.' : ''}
                </Text>
                <TextInput
                  style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]}
                  value={quickSmsText}
                  onChangeText={setQuickSmsText}
                  placeholder="Type your message here..."
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  maxLength={480}
                />
                <Text style={[s.inputHint, {
                  textAlign: 'right',
                  color: quickCharCount > 320 ? '#ff4757' : quickCharCount > 160 ? '#f0b429' : colors.textMuted
                }]}>
                  {quickCharCount}/160 chars ({quickSegments} segment{quickSegments > 1 ? 's' : ''})
                </Text>
                {quickSegments > 1 && (
                  <Text style={s.warningText}>{quickSegments} segments = {quickSegments}x cost per text!</Text>
                )}

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 16 }}
                  onPress={() => setQuickPersonalize(!quickPersonalize)}
                >
                  <BrandedIcon name={quickPersonalize ? 'checkbox' : 'checkboxEmpty'} size={22}
                    color={quickPersonalize ? colors.accent : colors.textMuted} />
                  <Text style={{ fontFamily: FONT_BODY_MEDIUM, fontSize: 14, color: colors.textSecondary }}>
                    Prepend recipient's first name
                  </Text>
                </TouchableOpacity>

                <View style={s.divider} />
                <View style={s.recipientHeader}>
                  <Text style={s.sectionTitle}>Recipients</Text>
                  <Text style={s.recipientCount}>{quickSelectedPlayers.length}/{poolPlayers.length}</Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <View style={s.searchContainer}>
                    <BrandedIcon name="search" size={18} color={colors.textMuted} />
                    <TextInput style={s.searchInput} value={quickPlayerSearch} onChangeText={setQuickPlayerSearch}
                      placeholder="Search by name, level, city..." placeholderTextColor={colors.inputPlaceholder} />
                    {quickPlayerSearch ? (
                      <TouchableOpacity onPress={() => setQuickPlayerSearch('')}>
                        <BrandedIcon name="close" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={s.bulkActions}>
                  <TouchableOpacity style={s.bulkBtn} onPress={() => { haptic.tap(); setQuickSelectedPlayers(quickFilteredPlayers.map(p => p.id)); }}>
                    <BrandedIcon name="checkmark" size={14} color={colors.accent} />
                    <Text style={[s.bulkBtnText, { color: colors.accent }]}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.bulkBtn} onPress={() => { haptic.tap(); setQuickSelectedPlayers([]); }}>
                    <BrandedIcon name="close" size={14} color={colors.danger} />
                    <Text style={[s.bulkBtnText, { color: colors.danger }]}>Deselect All</Text>
                  </TouchableOpacity>
                </View>

                {loadingPlayers ? (
                  <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
                ) : (
                  <View style={{ marginTop: 4 }}>
                    {quickFilteredPlayers.map(player => {
                      const sel = quickSelectedPlayers.includes(player.id);
                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={[s.playerRow, sel && s.playerRowSelected]}
                          onPress={() => toggleQuickPlayer(player.id)}
                        >
                          <BrandedIcon name={sel ? 'checkbox' : 'checkboxEmpty'} size={22}
                            color={sel ? colors.accent : colors.textMuted} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.playerName}>{player.first_name} {player.last_name}</Text>
                            <Text style={s.playerMeta}>
                              {player.play_level || 'N/A'}{player.cities_to_play ? ` · ${player.cities_to_play}` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={[s.sendBtn, quickSending && { opacity: 0.6 }]}
                  onPress={handleSendQuickSms} disabled={quickSending}
                >
                  {quickSending ? <ActivityIndicator color="#0f1b2d" /> : (
                    <>
                      <BrandedIcon name="send" size={20} color="#0f1b2d" />
                      <Text style={s.sendBtnText}>SEND TO {quickSelectedPlayers.length} PLAYERS</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
              </ScrollView>
            )
          ) : broadcastTab === 'compose' ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

              {/* ── AI Content Generator ── */}
              <View style={{
                backgroundColor: isDark ? 'rgba(135,202,55,0.06)' : 'rgba(109,184,44,0.06)',
                borderWidth: 1, borderColor: isDark ? 'rgba(135,202,55,0.2)' : 'rgba(109,184,44,0.2)',
                borderRadius: 16, padding: 16, marginBottom: 20,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <BrandedIcon name="star" size={16} color={colors.accent} />
                  <Text style={{ fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: colors.accent, letterSpacing: 1 }}>AI CONTENT GENERATOR</Text>
                </View>
                <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 13, color: colors.textMuted, marginBottom: 10, lineHeight: 18 }}>
                  Describe what this broadcast is about and AI will generate the subject, SMS text, and landing page content for you.
                </Text>
                <TextInput
                  style={[s.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]}
                  value={aiTheme}
                  onChangeText={setAiTheme}
                  placeholder="e.g. We're hosting a big tournament at Great Park on April 15th with prizes for all levels. $10 entry fee, BBQ included."
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                />
                <TouchableOpacity
                  style={[s.previewLandingBtn, aiGenerating && { opacity: 0.5 }]}
                  onPress={handleAiGenerate}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? (
                    <>
                      <ActivityIndicator size="small" color="#0f1b2d" />
                      <Text style={s.previewLandingBtnText}>GENERATING...</Text>
                    </>
                  ) : (
                    <>
                      <BrandedIcon name="star" size={16} color="#0f1b2d" />
                      <Text style={s.previewLandingBtnText}>GENERATE WITH AI</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={s.divider} />

              <Text style={s.inputLabel}>SUBJECT / HEADLINE</Text>
              <TextInput style={s.input} value={subject} onChangeText={setSubject}
                placeholder="e.g. New Tournament Coming in April!" placeholderTextColor={colors.inputPlaceholder} />

              <Text style={s.inputLabel}>SMS TEXT (SHORT & SWEET)</Text>
              <Text style={s.inputHint}>
                Keep brief — link auto-appended. {smsCharCount}/160 chars ({smsSegments} segment{smsSegments > 1 ? 's' : ''})
              </Text>
              <TextInput style={[s.input, { minHeight: 70 }]} value={smsText} onChangeText={setSmsText}
                placeholder="e.g. Exciting news from PlayPBNow! New tournament with prizes."
                placeholderTextColor={colors.inputPlaceholder} multiline maxLength={300} />
              {smsSegments > 1 && (
                <Text style={s.warningText}>{smsSegments} segments = {smsSegments}x cost per text!</Text>
              )}

              <Text style={s.inputLabel}>LANDING PAGE CONTENT (HTML)</Text>
              <Text style={s.inputHint}>Rich content people see when they tap the link.</Text>
              <TextInput
                style={[s.input, { minHeight: 160, textAlignVertical: 'top' }]}
                value={bodyHtml} onChangeText={setBodyHtml}
                placeholder={'<h2>Details</h2>\n<p>Join us for...</p>'}
                placeholderTextColor={colors.inputPlaceholder} multiline />

              {/* Media Upload — drag & drop on web, picker on native */}
              <TouchableOpacity
                testID="media-drop-zone"
                nativeID="media-drop-zone"
                style={{
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 12, paddingVertical: Platform.OS === 'web' ? 40 : 14, paddingHorizontal: 20,
                  borderRadius: 12, borderWidth: 2, borderStyle: 'dashed',
                  borderColor: dragging ? colors.accent : uploading ? colors.textMuted : 'rgba(135,202,55,0.4)',
                  backgroundColor: dragging ? 'rgba(135,202,55,0.18)' : isDark ? 'rgba(135,202,55,0.06)' : 'rgba(135,202,55,0.08)',
                }}
                onPress={handleMediaUpload}
                disabled={uploading}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 14, color: colors.accent }}>UPLOADING & COMPRESSING...</Text>
                    <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted }}>
                      Videos are being compressed to web quality. This may take a moment.
                    </Text>
                  </>
                ) : dragging ? (
                  <>
                    <BrandedIcon name="image" size={32} color={colors.accent} />
                    <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 16, color: colors.accent }}>DROP IT HERE</Text>
                  </>
                ) : (
                  <>
                    <BrandedIcon name="image" size={24} color={colors.accent} />
                    <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 14, color: colors.accent }}>
                      {Platform.OS === 'web' ? 'DRAG & DROP OR CLICK TO ADD MEDIA' : 'ADD PHOTO OR VIDEO'}
                    </Text>
                    {Platform.OS === 'web' && (
                      <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted }}>
                        Drop images or videos here, or click to browse
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
              <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                Images resized, videos compressed to 720p MP4. Supports JPG, PNG, GIF, MP4, MOV.
              </Text>

              {/* Preview Buttons */}
              {(subject || bodyHtml) ? (
                <View style={{ gap: 8, marginTop: 16 }}>
                  {/* Primary: Open real landing page in browser */}
                  <TouchableOpacity
                    style={[s.previewLandingBtn, previewing && { opacity: 0.6 }]}
                    onPress={handlePreviewLandingPage}
                    disabled={previewing}
                  >
                    {previewing ? (
                      <ActivityIndicator color="#0f1b2d" size="small" />
                    ) : (
                      <BrandedIcon name="link" size={18} color="#0f1b2d" />
                    )}
                    <Text style={s.previewLandingBtnText}>
                      {draftCode ? 'PREVIEW UPDATED PAGE' : 'PREVIEW LANDING PAGE'}
                    </Text>
                  </TouchableOpacity>
                  {draftCode && (
                    <Text style={s.draftHint}>
                      Draft saved. Edit fields above and tap preview again to see changes.
                    </Text>
                  )}
                  {/* Secondary: Quick SMS preview */}
                  <TouchableOpacity style={s.secondaryBtn} onPress={() => setShowPreview(true)}>
                    <Text style={s.secondaryBtnText}>PREVIEW SMS TEXT</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={s.divider} />
              <View style={s.recipientHeader}>
                <Text style={s.sectionTitle}>Recipients</Text>
                <Text style={s.recipientCount}>{selectedPlayers.length}/{poolPlayers.length}</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <View style={s.searchContainer}>
                  <BrandedIcon name="search" size={18} color={colors.textMuted} />
                  <TextInput style={s.searchInput} value={playerSearch} onChangeText={setPlayerSearch}
                    placeholder="Search players..." placeholderTextColor={colors.inputPlaceholder} />
                  {playerSearch ? (
                    <TouchableOpacity onPress={() => setPlayerSearch('')}>
                      <BrandedIcon name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={s.bulkActions}>
                <TouchableOpacity style={s.bulkBtn} onPress={() => { haptic.tap(); setSelectedPlayers(poolPlayers.map(p => p.id)); }}>
                  <BrandedIcon name="checkmark" size={14} color={colors.accent} />
                  <Text style={[s.bulkBtnText, { color: colors.accent }]}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.bulkBtn} onPress={() => { haptic.tap(); setSelectedPlayers([]); }}>
                  <BrandedIcon name="close" size={14} color={colors.danger} />
                  <Text style={[s.bulkBtnText, { color: colors.danger }]}>Deselect All</Text>
                </TouchableOpacity>
              </View>

              {loadingPlayers ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
              ) : (
                <View style={{ marginTop: 4 }}>
                  {poolPlayers.map(player => {
                    const sel = selectedPlayers.includes(player.id);
                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[s.playerRow, sel && s.playerRowSelected]}
                        onPress={() => togglePlayer(player.id)}
                      >
                        <BrandedIcon name={sel ? 'checkbox' : 'checkboxEmpty'} size={22}
                          color={sel ? colors.accent : colors.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.playerName}>{player.first_name} {player.last_name}</Text>
                          <Text style={s.playerMeta}>
                            {player.play_level || 'N/A'}{player.cities_to_play ? ` · ${player.cities_to_play}` : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[s.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSendBroadcast} disabled={sending}
              >
                {sending ? <ActivityIndicator color="#0f1b2d" /> : (
                  <>
                    <BrandedIcon name="send" size={20} color="#0f1b2d" />
                    <Text style={s.sendBtnText}>SEND TO {selectedPlayers.length} PLAYERS</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <FlatList
              data={broadcasts}
              keyExtractor={b => b.id.toString()}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={<View style={s.emptyState}><Text style={s.emptyText}>No broadcasts yet</Text></View>}
              renderItem={({ item }) => (
                <View style={s.historyCard}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`https://peoplestar.com/PlayPBNow/broadcast.html?code=${item.broadcast_code}`)}
                    style={{ flex: 1 }}
                  >
                    <View style={s.activityRow}>
                      <Text style={[s.activityTitle, { flex: 1 }]} numberOfLines={1}>{item.subject}</Text>
                      <Text style={[s.subBadge,
                        item.status === 'sent' && { backgroundColor: 'rgba(135,202,55,0.15)', color: colors.accent },
                      ]}>{item.status}</Text>
                    </View>
                    <Text style={s.activityMeta} numberOfLines={2}>{item.sms_text}</Text>
                    <View style={[s.activityRow, { marginTop: 8 }]}>
                      <Text style={s.activityTime}>{fmtDateTime(item.created_at)}</Text>
                      <Text style={[s.activityBadge, { color: colors.accent }]}>{item.sent_count} sent</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, alignSelf: 'flex-end', borderRadius: 8, backgroundColor: 'rgba(255,71,87,0.1)' }}
                    onPress={() => handleDeleteBroadcast(item.id, item.subject)}
                  >
                    <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 12, color: '#ff4757', letterSpacing: 0.5 }}>DELETE</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {/* Preview Modal */}
          <Modal visible={showPreview} animationType="slide" transparent>
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Preview</Text>
                  <TouchableOpacity onPress={() => setShowPreview(false)}>
                    <BrandedIcon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <View style={s.previewHero}>
                    <Text style={s.previewBadge}>ANNOUNCEMENT</Text>
                    <Text style={s.previewTitle}>{subject || 'Your Subject Here'}</Text>
                  </View>
                  <View style={s.previewCard}>
                    <Text style={s.previewBody}>
                      {bodyHtml ? bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'Content here...'}
                    </Text>
                  </View>
                  <Text style={s.previewSmsLabel}>SMS PREVIEW</Text>
                  <View style={s.previewSmsBubble}>
                    <Text style={s.previewSmsText}>
                      {smsText || 'SMS text'}{'\n\n'}Details: https://peoplestar.com/PlayPBNow/broadcast.html?code=XXXXXXXX
                    </Text>
                  </View>
                  <Text style={s.previewSmsInfo}>{smsCharCount} chars + ~70 char link = ~{smsCharCount + 70} total</Text>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ──

function StatCard({ s, colors, label, value, accent }: { s: any; colors: any; label: string; value: number; accent?: boolean }) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue, accent && { color: colors.accent }]}>{value.toLocaleString()}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ s, colors, label, value }: { s: any; colors: any; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

// ── Styles ──

function createStyles(colors: ThemeColors, isDark: boolean) {
  return {
    container: { flex: 1, backgroundColor: colors.bg },
    gateView: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, padding: 40, gap: 16 },
    gateTitle: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 24, color: colors.text },
    gateSubtitle: { fontFamily: FONT_BODY_REGULAR, fontSize: 15, color: colors.textMuted, textAlign: 'center' as const },

    // Header
    header: {
      flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
      paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 28, color: colors.text, letterSpacing: 2 },
    adminBadge: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    adminBadgeText: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 11, color: '#0f1b2d', letterSpacing: 1 },

    // Tab scroller
    tabScroller: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
    tabChip: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
      paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
      backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.border,
    },
    tabChipActive: { backgroundColor: isDark ? 'rgba(135,202,55,0.12)' : 'rgba(109,184,44,0.12)', borderColor: isDark ? 'rgba(135,202,55,0.3)' : 'rgba(109,184,44,0.3)' },
    tabChipText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: colors.textMuted },
    tabChipTextActive: { color: colors.accent },

    // Sub tabs (broadcast)
    subTabBar: { flexDirection: 'row' as const, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    subTab: { flex: 1, paddingVertical: 8, alignItems: 'center' as const, borderRadius: 10, backgroundColor: colors.glassBg },
    subTabActive: { backgroundColor: isDark ? 'rgba(135,202,55,0.12)' : 'rgba(109,184,44,0.12)' },
    subTabText: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: colors.textMuted },
    subTabTextActive: { color: colors.accent },

    // Error
    errorBanner: { backgroundColor: 'rgba(255,71,87,0.12)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', borderRadius: 12, padding: 14, marginHorizontal: 16, marginTop: 8 },
    errorText: { fontFamily: FONT_BODY_MEDIUM, fontSize: 14, color: '#ff6b7a' },

    // Section labels
    sectionLabel: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 11, color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginTop: 20, marginBottom: 8 },
    sectionTitle: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 18, color: colors.text },

    // Stat grid
    statGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
    statCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border,
      minWidth: 100, flex: 1, alignItems: 'center' as const,
    },
    statValue: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 28, color: colors.text },
    statLabel: { fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted, textAlign: 'center' as const, marginTop: 4 },

    // Activity cards
    activityCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    activityRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    activityTitle: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14, color: colors.text, flex: 1 },
    activityMeta: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted, marginTop: 4 },
    activityTime: { fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted, marginTop: 4 },
    activityBadge: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 12, color: colors.textMuted },
    subBadge: {
      fontFamily: FONT_BODY_BOLD, fontSize: 10, color: colors.textMuted, letterSpacing: 0.5,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)',
      textTransform: 'uppercase' as const, overflow: 'hidden' as const,
    },

    // Engagement rows
    engageRow: {
      flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.card,
      borderRadius: 14, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border, gap: 10,
    },
    engageRank: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 16, color: colors.textMuted, width: 28, textAlign: 'center' as const },
    engageStats: { alignItems: 'center' as const, minWidth: 50 },
    engageNum: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 18, color: colors.text },
    engageLabel: { fontFamily: FONT_BODY_REGULAR, fontSize: 10, color: colors.textMuted },

    // User card
    userCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },

    // Leaderboard
    leaderboardRow: {
      flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.card,
      borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: colors.border, gap: 12,
    },
    leaderboardRank: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 20, color: colors.textMuted, width: 32, textAlign: 'center' as const },
    wlBox: { alignItems: 'flex-end' as const },
    wlText: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 13 },
    wlPct: { fontFamily: FONT_BODY_MEDIUM, fontSize: 11, color: colors.textMuted, marginTop: 2 },

    // Filter chips
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 6,
      backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.border,
    },
    filterChipActive: { backgroundColor: isDark ? 'rgba(135,202,55,0.12)' : 'rgba(109,184,44,0.12)', borderColor: isDark ? 'rgba(135,202,55,0.3)' : 'rgba(109,184,44,0.3)' },
    filterChipText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: colors.textMuted },
    filterChipTextActive: { color: colors.accent },

    // Groups
    groupCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    groupStats: { flexDirection: 'row' as const, gap: 16, marginTop: 8 },
    groupStat: { fontFamily: FONT_BODY_MEDIUM, fontSize: 12, color: colors.textMuted },
    deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,71,87,0.1)' },

    // Database
    tableRow: {
      flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
      paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    tableName: { fontFamily: FONT_BODY_MEDIUM, fontSize: 14, color: colors.text },
    tableCount: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 16, color: colors.textMuted },

    // Detail modal
    modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay },
    modalContent: { flex: 1, backgroundColor: colors.bg, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    modalHeader: {
      flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
      paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalTitle: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 20, color: colors.text },
    detailName: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 24, color: colors.text, marginBottom: 16 },
    detailRow: {
      flexDirection: 'row' as const, justifyContent: 'space-between' as const,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    detailLabel: { fontFamily: FONT_BODY_MEDIUM, fontSize: 14, color: colors.textMuted },
    detailValue: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: colors.text },
    actionBtn: {
      padding: 14, borderRadius: 12, alignItems: 'center' as const, marginTop: 10,
      backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.border,
    },
    actionBtnText: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: colors.text, letterSpacing: 0.5 },

    // Search
    searchContainer: {
      flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.inputBg,
      borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12,
    },
    searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontFamily: FONT_BODY_REGULAR, fontSize: 15, color: colors.text },

    // Refresh
    refreshBtn: {
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
      gap: 8, marginTop: 24, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    },
    refreshBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: colors.accent },

    // Empty
    emptyState: { alignItems: 'center' as const, padding: 40, gap: 8 },
    emptyText: { fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: colors.textMuted, textAlign: 'center' as const },

    // Broadcast inputs
    inputLabel: {
      fontFamily: FONT_DISPLAY_BOLD, fontSize: 12, color: colors.textMuted,
      letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 6, marginTop: 16,
    },
    inputHint: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted, marginBottom: 6 },
    input: {
      backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: 12, padding: 14, fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: colors.inputText,
    },
    warningText: { fontFamily: FONT_BODY_MEDIUM, fontSize: 12, color: colors.gold, marginTop: 4 },
    divider: { height: 1, backgroundColor: colors.border, marginTop: 24, marginBottom: 8 },
    recipientHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 8 },
    recipientCount: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: colors.accent },
    bulkActions: { flexDirection: 'row' as const, gap: 12, marginTop: 8, marginBottom: 4 },
    bulkBtn: {
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
      backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.border,
    },
    bulkBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12 },
    playerRow: {
      flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12,
      borderRadius: 12, marginBottom: 4, gap: 12, backgroundColor: colors.glassBg, borderWidth: 1, borderColor: 'transparent',
    },
    playerRowSelected: {
      borderColor: isDark ? 'rgba(135,202,55,0.2)' : 'rgba(109,184,44,0.2)',
      backgroundColor: isDark ? 'rgba(135,202,55,0.04)' : 'rgba(109,184,44,0.04)',
    },
    playerName: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14, color: colors.text },
    playerMeta: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    sendBtn: {
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
      gap: 10, backgroundColor: colors.accent, padding: 18, borderRadius: 16, marginTop: 24,
    },
    sendBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16, color: '#0f1b2d', letterSpacing: 1 },

    // Results
    resultsView: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, padding: 32, gap: 12 },
    resultsIcon: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(135,202,55,0.15)',
      justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 8,
    },
    resultsTitle: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 28, color: colors.text },
    resultsSubtitle: { fontFamily: FONT_BODY_REGULAR, fontSize: 16, color: colors.textMuted },
    resultsCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '100%' as const,
      marginTop: 16, borderWidth: 1, borderColor: colors.border,
    },
    resultsLabel: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
    resultsLink: { fontFamily: FONT_BODY_MEDIUM, fontSize: 14, color: colors.accent, lineHeight: 20 },
    primaryBtn: { backgroundColor: colors.accent, padding: 16, borderRadius: 14, alignItems: 'center' as const, marginTop: 20, width: '100%' as const },
    primaryBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 15, color: '#0f1b2d', letterSpacing: 1 },
    previewLandingBtn: {
      flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
      gap: 10, backgroundColor: colors.accent, padding: 16, borderRadius: 14,
    },
    previewLandingBtnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 14, color: '#0f1b2d', letterSpacing: 1 },
    draftHint: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: colors.accent, textAlign: 'center' as const, lineHeight: 16 },
    secondaryBtn: { padding: 14, borderRadius: 12, alignItems: 'center' as const, borderWidth: 1, borderColor: colors.border },
    secondaryBtnText: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 13, color: colors.textMuted, letterSpacing: 0.5 },

    // History
    historyCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },

    // Preview
    previewHero: { alignItems: 'center' as const, marginBottom: 24, gap: 12 },
    previewBadge: {
      fontFamily: FONT_DISPLAY_BOLD, fontSize: 11, color: colors.accent, letterSpacing: 2,
      backgroundColor: isDark ? 'rgba(135,202,55,0.12)' : 'rgba(109,184,44,0.12)',
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' as const,
    },
    previewTitle: { fontFamily: FONT_DISPLAY_BLACK, fontSize: 24, color: colors.text, textAlign: 'center' as const },
    previewCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
    previewBody: { fontFamily: FONT_BODY_REGULAR, fontSize: 15, color: colors.textSoft, lineHeight: 24 },
    previewSmsLabel: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 11, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
    previewSmsBubble: {
      backgroundColor: isDark ? 'rgba(135,202,55,0.08)' : 'rgba(109,184,44,0.08)',
      borderRadius: 16, borderTopLeftRadius: 4, padding: 16, borderWidth: 1,
      borderColor: isDark ? 'rgba(135,202,55,0.15)' : 'rgba(109,184,44,0.15)',
    },
    previewSmsText: { fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: colors.text, lineHeight: 20 },
    previewSmsInfo: { fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: colors.textMuted, marginTop: 6 },
  };
}
