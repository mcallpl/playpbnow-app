import { useCallback, useEffect, useRef, useState } from 'react';
import { playChatPing } from '../utils/sounds';

const API_URL = 'https://peoplestar.com/Chipleball/api';
const POLL_INTERVAL = 3000;

export interface ChatMessage {
  id: number;
  beacon_id: number;
  user_id: string;
  user_name: string;
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

  const fetchMessages = useCallback(async (beaconId: number, afterId?: number) => {
    try {
      let url = `${API_URL}/beacon_chat_poll.php?beacon_id=${beaconId}`;
      if (afterId && afterId > 0) {
        url += `&after_id=${afterId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success' && data.messages) {
        if (afterId && afterId > 0) {
          // Incremental — append new messages, deduplicating
          if (data.messages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length > 0) {
                // Play ping if any new message is from someone else
                const hasOtherMessages = newMsgs.some(
                  (m: ChatMessage) => m.user_id !== currentUserIdRef.current
                );
                if (hasOtherMessages) {
                  playChatPing();
                }
                return [...prev, ...newMsgs];
              }
              return prev;
            });
            lastIdRef.current = data.messages[data.messages.length - 1].id;
          }
        } else {
          // Initial load
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastIdRef.current = data.messages[data.messages.length - 1].id;
          }
        }
      }
    } catch {
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
    beaconIdRef.current = null;
    initialFetchDoneRef.current = false;
  }, [clearPollingInterval]);

  const startPolling = useCallback((beaconId: number, currentUserId?: string) => {
    // Clear any existing polling
    clearPollingInterval();
    beaconIdRef.current = beaconId;
    lastIdRef.current = 0;
    initialFetchDoneRef.current = false;
    if (currentUserId) currentUserIdRef.current = currentUserId;
    setMessages([]);
    setIsLoading(true);

    // Initial fetch — only start interval polling AFTER this completes
    fetchMessages(beaconId).then(() => {
      setIsLoading(false);
      initialFetchDoneRef.current = true;

      // Now start the interval for incremental updates
      pollingRef.current = setInterval(() => {
        if (beaconIdRef.current && initialFetchDoneRef.current) {
          fetchMessages(beaconIdRef.current, lastIdRef.current);
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
      const data = await res.json();
      if (data.status === 'success' && data.message) {
        // Append immediately for instant feedback, skip if already present
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        lastIdRef.current = data.message.id;
        return true;
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
