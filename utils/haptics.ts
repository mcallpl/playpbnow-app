import * as Haptics from 'expo-haptics';

const noop = () => {};

export const haptic = {
  confirm: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(noop),
  lock: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(noop),
  start: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(noop),
  get save() { return haptic.confirm; },
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(noop),
};
