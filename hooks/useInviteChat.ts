import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { playChatPing } from '../utils/sounds';

// Canonical API host (audit C1). The old peoplestar.com/PlayPBNow/api value
// never matched utils/apiClient's API_MARKER, so no Bearer token was attached
// (every call 401'd) and on web the CORS pin blocked it outright — chat was
// dead everywhere and sends failed silently.
const API_URL = 'https://playpbnow.com/api';
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
  // Last send failure, in words the organizer can act on. Cleared on the
  // next successful send. The screen shows it under the input (audit C1:
  // failures used to vanish without a trace).
  const [sendError, setSendError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // App in the background: keep the interval but skip the network call
  // (LOW: pause polling on AppState background). Resumes on foreground.
  const appActiveRef = useRef(true);
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
        if (!appActiveRef.current) return;
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
      if (!res.ok) {
        // Read the server's reason when there is one (401 session, 403 not
        // the organizer, etc.) instead of a bare status code.
        let reason = '';
        try { reason = (await res.json())?.message || ''; } catch { /* non-JSON body */ }
        throw new Error(reason || (res.status === 401 ? 'Please sign in again' : `Could not send (HTTP ${res.status})`));
      }
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        const msg = data.data;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        lastIdRef.current = msg.id;
        setSendError(null);
        return true;
      }
      setSendError(data.message || 'Message not sent');
      return false;
    } catch (err) {
      setSendError(err instanceof Error && err.message ? err.message : 'Network error — message not sent');
      return false;
    }
  }, []);

  const clearSendError = useCallback(() => setSendError(null), []);

  // Pause the poll while the app is backgrounded; catch up immediately on
  // return so the chat is current before the user looks at it.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const active = next === 'active';
      const wasActive = appActiveRef.current;
      appActiveRef.current = active;
      if (active && !wasActive && inviteIdRef.current && initialFetchDoneRef.current && !pollInProgressRef.current) {
        pollInProgressRef.current = true;
        fetchMessages(inviteIdRef.current, lastIdRef.current)
          .finally(() => { pollInProgressRef.current = false; });
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => { sub.remove(); };
  }, [fetchMessages]);

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
    sendError,
    clearSendError,
  };
}
