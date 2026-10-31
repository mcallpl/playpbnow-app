/**
 * A group's remembered court names (2026-10-31), kept on the server so they
 * follow the organizer to any phone or the web. Only ever OFFERED back
 * ("Use CRT D, E, F again?"); never applied without a tap.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDefaultCourtLabels } from './courtLabels';

const API_URL = 'https://playpbnow.com/api';

export async function loadGroupCourtLabels(groupKey: string): Promise<string[]> {
    if (!groupKey) return [];
    try {
        const r = await fetch(`${API_URL}/group_court_labels.php?group_key=${encodeURIComponent(groupKey)}`);
        const d = await r.json();
        return d?.status === 'success' && Array.isArray(d.labels) ? d.labels.map(String) : [];
    } catch { return []; }
}

export async function rememberGroupCourtLabels(groupKey: string, labels: string[]): Promise<void> {
    if (!groupKey) return;
    try {
        await fetch(`${API_URL}/group_court_labels.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_key: groupKey, labels: isDefaultCourtLabels(labels) ? [] : labels }),
        });
    } catch { /* offline: the names still apply to this match */ }
}

// The NEW tag on NAME COURTS: shown until the organizer has used it once, or
// for their first few matches, whichever comes first. Per device.
const NEW_USED = 'court_names_used';
const NEW_VIEWS = 'court_names_new_views';
const NEW_MAX_VIEWS = 5;

export async function shouldShowCourtNamesNew(): Promise<boolean> {
    try {
        if (await AsyncStorage.getItem(NEW_USED)) return false;
        const n = parseInt((await AsyncStorage.getItem(NEW_VIEWS)) || '0', 10) || 0;
        if (n >= NEW_MAX_VIEWS) return false;
        await AsyncStorage.setItem(NEW_VIEWS, String(n + 1));
        return true;
    } catch { return false; }
}

export async function markCourtNamesUsed(): Promise<void> {
    try { await AsyncStorage.setItem(NEW_USED, '1'); } catch { /* ignore */ }
}
