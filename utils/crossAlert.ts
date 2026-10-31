/**
 * Cross-platform Alert shim.
 *
 * react-native-web's Alert.alert is a no-op (`static alert() {}`), which means
 * every confirmation and error dialog silently does nothing on the web build —
 * Log Out, Delete Account/Group/Player, Merge Players, error messages, etc. all
 * fail to work. This shim delegates to the real React Native Alert on native
 * (identical behavior) and uses native browser dialogs (window.confirm /
 * window.alert) on web so those flows actually function.
 *
 * Usage is drop-in: files import { Alert } from '@/utils/crossAlert' instead of
 * from 'react-native', and keep calling Alert.alert(title, message, buttons).
 */
import { Alert as RNAlert, Platform, AlertButton, AlertOptions } from 'react-native';

// In-app dialog for the web (2026-10-31): components/AlertHost registers
// itself here at the app root. While it is mounted every web alert is drawn
// as a PlayPBNow dialog with its real button labels; if it is not mounted
// (very early in startup, or a page outside the app) the browser popups
// below are still used, so an alert is never lost.
export interface WebDialog { title: string; message?: string; buttons?: AlertButton[] }
let alertHost: ((d: WebDialog) => void) | null = null;
export function registerAlertHost(fn: ((d: WebDialog) => void) | null): void { alertHost = fn; }
/**
 * True only when a web screen must fall back to the browser's own popup:
 * on the web with no in-app dialog mounted. Screens that used to call
 * window.confirm / window.alert directly on the web now take their
 * phone branch (Alert.alert with real button labels) whenever this is false.
 */
export function useBrowserPopups(): boolean { return Platform.OS === 'web' && !alertHost; }

function webAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  _options?: AlertOptions
): void {
  if (alertHost) { alertHost({ title, message, buttons }); return; }
  const body = [title, message].filter(Boolean).join('\n\n');

  // No buttons, or a single "OK"-style button: informational alert.
  if (!buttons || buttons.length <= 1) {
    // eslint-disable-next-line no-alert
    window.alert(body);
    const only = buttons && buttons[0];
    if (only && only.style !== 'cancel') only.onPress?.();
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');

  // Two buttons → map to a single OK/Cancel confirm dialog.
  if (buttons.length === 2) {
    const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[0];
    // eslint-disable-next-line no-alert
    const ok = window.confirm(body);
    if (ok) confirmBtn?.onPress?.();
    else (cancelBtn || buttons.find((b) => b !== confirmBtn))?.onPress?.();
    return;
  }

  // Three or more buttons → offer each non-cancel option in sequence.
  const choices = buttons.filter((b) => b.style !== 'cancel');
  for (const choice of choices) {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${body}\n\nOK = "${choice.text}"  (Cancel to see other options)`)) {
      choice.onPress?.();
      return;
    }
  }
  cancelBtn?.onPress?.();
}

export const Alert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ): void {
    if (Platform.OS === 'web') {
      webAlert(title, message, buttons, options);
    } else {
      RNAlert.alert(title, message, buttons, options);
    }
  },
};
