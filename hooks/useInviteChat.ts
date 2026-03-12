import { useCallback, useEffect, useRef, useState } from 'react';
import { playChatPing } from '../utils/sounds';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';
const POLL_INTERVAL = 3000;

export interface InviteChatMessage {
  id: number;
  invite_id: number;
  user_id: string | null;
  player_id: number | null;
  sender_name: string;
  message: string;
  is_system: string;
  created_at: string;
}

export function useInviteChat() {
  const [messages, setMessages] = useState<InviteChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<number>(0);
  const inviteIdRef = useRef<number | null>(null);
  const initialFetchDoneRef = useRef(false);
  const currentUserIdRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollInProgressRef = useRef(false);

  const fetchMessages = useCallback(async (inviteId: number, afterId?: number, isInitial = false) => {
    try {
      let url = `${API_URL}/invite_chat_poll.php?invite_id=${inviteId}`;
      if ((afterId ?? 0) > 0) {
        url += `&after_id=${afterId}`;
      }
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const res = await fetch(url, { signal: abortControllerRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success' && data.messages) {
        if (!isInitial) {
          if (data.messages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.messages.filter((m: InviteChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length > 0) {
                const hasOtherMessages = newMsgs.some(
                  (m: InviteChatMessage) => m.user_id !== currentUserIdRef.current
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
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastIdRef.current = data.messages[data.messages.length - 1].id;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
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
    inviteIdRef.current = null;
    initialFetchDoneRef.current = false;
    pollInProgressRef.current = false;
  }, [clearPollingInterval]);

  const startPolling = useCallback((inviteId: number, currentUserId?: string) => {
    clearPollingInterval();
    abortControllerRef.current?.abort();
    inviteIdRef.current = inviteId;
    lastIdRef.current = 0;
    initialFetchDoneRef.current = false;
    pollInProgressRef.current = false;
    if (currentUserId) currentUserIdRef.current = currentUserId;
    setMessages([]);
    setIsLoading(true);

    fetchMessages(inviteId, undefined, true).then(() => {
      if (inviteIdRef.current !== inviteId) return;
      setIsLoading(false);
      initialFetchDoneRef.current = true;

      pollingRef.current = setInterval(() => {
        if (inviteIdRef.current === inviteId && !pollInProgressRef.current) {
          pollInProgressRef.current = true;
          fetchMessages(inviteIdRef.current, lastIdRef.current)
            .finally(() => { pollInProgressRef.current = false; });
        }
      }, POLL_INTERVAL);
    });
  }, [fetchMessages, clearPollingInterval]);

  const sendMessage = useCallback(async (
    inviteId: number,
    userId: string,
    text: string,
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/invite_chat_send.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_id: inviteId,
          user_id: userId,
          message: text,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        const msg = data.data;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        lastIdRef.current = msg.id;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPollingInterval();
      abortControllerRef.current?.abort();
      inviteIdRef.current = null;
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
