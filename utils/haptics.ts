import * as Haptics from 'expo-haptics';

export const haptic = {
  confirm: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  lock: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  start: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  save: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};
