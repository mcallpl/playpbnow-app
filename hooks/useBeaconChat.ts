import { useCallback, useEffect, useRef, useState } from 'react';
import { playChatPing } from '../utils/sounds';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://peoplestar.com/PlayPBNow/api';
const SHARED_BEACON_URL = 'https://peoplestar.com/shared/beacon/api';
const POLL_INTERVAL = 3000;

export interface ChatMessage {
  id: number;
  beacon_id: number;
  user_id: string;
  user_name: string;
  sender_name?: string;
  message: string;
  created_at: string;
}

export function useBeaconChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<number>(0);
  const beaconIdRef = useRef<number | null>(null);
  const initialFetchDoneRef = useRef(false);
  const currentUserIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollInProgressRef = useRef(false);
  // Track whether this beacon is on the shared API or local
  const useSharedApiRef = useRef(true);

  const fetchMessages = useCallback(async (beaconId: number, afterId?: number, isInitial = false) => {
    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      let data: any;

      if (useSharedApiRef.current) {
        // Shared beacon API (POST with JSON body)
        const res = await fetch(`${SHARED_BEACON_URL}/chat_poll.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beacon_id: beaconId,
            since_id: (afterId ?? 0) > 0 ? afterId : 0,
          }),
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        // Normalize shared API response to match expected format
        if (data.messages) {
          data.messages = data.messages.map((m: any) => ({
            ...m,
            user_name: m.sender_name || m.user_name || 'Player',
          }));
        }
      } else {
        // Local PlayPBNow API (GET with query params)
        let url = `${API_URL}/beacon_chat_poll.php?beacon_id=${beaconId}`;
        if ((afterId ?? 0) > 0) {
          url += `&after_id=${afterId}`;
        }
        const res = await fetch(url, { signal: abortControllerRef.current.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }

      if (data.status === 'success' && data.messages) {
        if (!isInitial) {
          // Incremental — append new messages, deduplicating
          if (data.messages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length > 0) {
                // Play ping if any new message is from someone else
                const hasOtherMessages = newMsgs.some(
                  (m: ChatMessage) => String(m.user_id) !== currentUserIdRef.current
                );
                if (hasOtherMessages) {
                  playChatPing();
                }
                return [...prev, ...newMsgs];
              }
              return prev;
            });
            const maxId = data.messages[data.messages.length - 1].id;
            if (maxId > lastIdRef.current) {
              lastIdRef.current = maxId;
            }
          }
        } else {
          // Initial load
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastIdRef.current = data.messages[data.messages.length - 1].id;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Silently fail on poll errors
    }
  }, []);

  const clearPollingInterval = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearPollingInterval();
    abortControllerRef.current?.abort();
    beaconIdRef.current = null;
    initialFetchDoneRef.current = false;
    pollInProgressRef.current = false;
  }, [clearPollingInterval]);

  const startPolling = useCallback((beaconId: number, currentUserId?: string, isSharedBeacon = true) => {
    // Clear any existing polling
    clearPollingInterval();
    abortControllerRef.current?.abort();
    beaconIdRef.current = beaconId;
    lastIdRef.current = 0;
    initialFetchDoneRef.current = false;
    pollInProgressRef.current = false;
    useSharedApiRef.current = isSharedBeacon;
    if (currentUserId) currentUserIdRef.current = currentUserId;
    setMessages([]);
    setIsLoading(true);

    // Initial fetch — only start interval polling AFTER this completes
    fetchMessages(beaconId, undefined, true).then(() => {
      // Bail out if this session was superseded by stopPolling or a new startPolling call
      if (beaconIdRef.current !== beaconId) return;
      setIsLoading(false);
      initialFetchDoneRef.current = true;

      // Now start the interval for incremental updates
      pollingRef.current = setInterval(() => {
        if (beaconIdRef.current === beaconId && !pollInProgressRef.current) {
          pollInProgressRef.current = true;
          fetchMessages(beaconIdRef.current, lastIdRef.current)
            .finally(() => { pollInProgressRef.current = false; });
        }
      }, POLL_INTERVAL);
    });
  }, [fetchMessages, clearPollingInterval]);

  const sendMessage = useCallback(async (
    beaconId: number,
    userId: string,
    userName: string,
    text: string,
  ): Promise<boolean> => {
    try {
      let data: any;

      if (useSharedApiRef.current) {
        // Shared beacon API
        const res = await fetch(`${SHARED_BEACON_URL}/chat_send.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beacon_id: beaconId,
            user_id: parseInt(userId) || 0,
            message: text,
            sender_name: userName,
            sender_photo: '',
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();

        if (data.status === 'success' && data.message_id) {
          // Create local message for instant feedback
          const localMsg: ChatMessage = {
            id: data.message_id,
            beacon_id: beaconId,
            user_id: userId,
            user_name: userName,
            sender_name: userName,
            message: text,
            created_at: new Date().toISOString(),
          };
          setMessages(prev => {
            if (prev.some(m => m.id === localMsg.id)) return prev;
            return [...prev, localMsg];
          });
          lastIdRef.current = data.message_id;
          return true;
        }
      } else {
        // Local PlayPBNow API
        const res = await fetch(`${API_URL}/beacon_chat_send.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beacon_id: beaconId,
            user_id: userId,
            user_name: userName,
            message: text,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        if (data.status === 'success' && (data.message || data.data)) {
          const msg = data.data || data.message;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          lastIdRef.current = msg.id;
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPollingInterval();
      abortControllerRef.current?.abort();
      beaconIdRef.current = null;
    };
  }, [clearPollingInterval]);

  return {
    messages,
    isLoading,
    sendMessage,
    startPolling,
    stopPolling,
  };
}
