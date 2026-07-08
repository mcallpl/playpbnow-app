/**
 * Auth token interceptor.
 *
 * The app authenticates by passing user_id in request bodies, which is
 * spoofable. This wraps the global fetch so that every request to the PlayPBNow
 * API automatically carries the logged-in user's session token
 * (Authorization: Bearer <token>). The server can then derive the real user_id
 * from the token instead of trusting the body.
 *
 * Safe by construction:
 *  - Only touches requests whose URL points at the PlayPBNow API; all other
 *    fetches (Stripe.js, RevenueCat, assets, etc.) pass through untouched.
 *  - The web app and API are same-origin, so adding this header does NOT trigger
 *    a CORS preflight; native requests aren't subject to browser CORS at all.
 *  - Only ADDS a header — never removes or rewrites anything else.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_MARKER = 'playpbnow.com/api';

let cachedToken: string | null = null;
let primed = false;

// Called when the server rejects our session (401). Registered by the root
// layout to route to /login. Without this, a dead token (expired, revoked,
// or clobbered) left users stranded on "Invalid or expired session" banners.
let onUnauthorized: (() => void) | null = null;
let lastUnauthorizedAt = 0;

export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

// Endpoints where a 401/failed-auth is part of normal flow, not a dead session.
const AUTH_EXEMPT = ['email_login', 'claim_', 'player_register', 'verify_code', 'send_verification'];

export async function primeAuthToken(): Promise<void> {
  try {
    cachedToken = await AsyncStorage.getItem('session_token');
  } catch {
    cachedToken = null;
  }
  primed = true;
}

/** Call on login (with the new token) and on logout (with null). */
export function setAuthToken(token: string | null): void {
  cachedToken = token;
  primed = true;
}

let installed = false;

export function installAuthInterceptor(): void {
  if (installed) return;
  installed = true;

  const g: any = global as any;
  const originalFetch: typeof fetch = g.fetch?.bind(g);
  if (!originalFetch) return;

  g.fetch = async (input: any, init?: any): Promise<Response> => {
    let isApiCall = false;
    let url = '';
    try {
      url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf(API_MARKER) !== -1) {
        isApiCall = true;
        if (!primed) {
          await primeAuthToken();
        }
        if (cachedToken) {
          const headers = new Headers(
            (init && init.headers) ||
              (typeof input !== 'string' && input && input.headers) ||
              {}
          );
          if (!headers.has('Authorization')) {
            headers.set('Authorization', 'Bearer ' + cachedToken);
            init = { ...(init || {}), headers };
          }
        }
      }
    } catch {
      // never let the interceptor break a request
    }

    const res = await originalFetch(input, init);

    // Session self-healing: a 401 from our API while we THOUGHT we were logged
    // in means the token is dead (expired, revoked, or clobbered). Clear it and
    // hand off to the login screen instead of leaving the user stuck mid-flow.
    try {
      if (
        isApiCall &&
        res.status === 401 &&
        cachedToken &&
        !AUTH_EXEMPT.some((frag) => url.indexOf(frag) !== -1)
      ) {
        const now = Date.now();
        if (now - lastUnauthorizedAt > 5000) { // debounce parallel 401 bursts
          lastUnauthorizedAt = now;
          cachedToken = null;
          AsyncStorage.multiRemove(['session_token', 'user_id']).catch(() => {});
          if (onUnauthorized) onUnauthorized();
        }
      }
    } catch {
      // never let the handler break a response
    }
    return res;
  };
}
