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

function webAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  _options?: AlertOptions
): void {
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
