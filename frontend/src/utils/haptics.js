import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// All calls no-op silently on web (and swallow any native rejection) so callers
// never have to guard. Only fire real haptics inside the native shell.
const isNative = () => Capacitor.isNativePlatform();

export function hapticMedium() {
  if (isNative()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}
export function hapticLight() {
  if (isNative()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
export function hapticSuccess() {
  if (isNative()) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
