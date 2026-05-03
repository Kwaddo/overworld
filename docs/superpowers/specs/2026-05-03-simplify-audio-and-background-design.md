# Simplify audio + background music — design

**Date:** 2026-05-03
**Scope:** Fix the `FileSystem.writeAsStringAsync` crash, remove the redundant `expo-background-task` plumbing, centralize permission code, strip dead code in the providers. No new features.

## Problem

Two complaints:

1. `AudioControls Error stopping sound: Call to function 'ExpondnetFileSystem.writeAsStringAsync' has been rejected. Caused by: java.lang.NoClassDefFoundError: Failed resolution of: Lexpo/modules/kotlin/services/FilePermissionService$Permission`
2. The codebase has more moving parts than the feature warrants, and the user wants the music to keep playing whenever the app is in foreground, switched away to another app, or with the screen locked (cases A/B/C). Recovery after the app is swipe-killed (D) is explicitly out of scope.

### Root cause of (1)

`lib/utils/controls.ts` generates a 1-second silent WAV at runtime by calling `FileSystem.writeAsStringAsync` from `expo-file-system/legacy`. The legacy module's native class lookup fails (`FilePermissionService$Permission`), almost certainly a build/version mismatch in `expo-file-system v55`. The whole runtime-WAV generation is a workaround for a problem that doesn't need it: the audio player just needs *something* to play in order to keep the `mediaPlayback` foreground service alive. A bundled asset works as well as a generated one and removes the entire native surface that's failing.

### Why complexity is excess

- `lib/tasks/background-wifi.ts` registers an `expo-background-task` with a 15-minute minimum interval. That's only useful for case (D), which the user does not need; for cases (A/B/C) the foreground-service trick already handles things. The task is dead weight.
- Permission requests are duplicated across `wifisongmaps.provider.tsx`, `btsongmaps.provider.tsx`, and `notifications.ts`. Each provider re-implements the same `PermissionsAndroid.request` pattern.
- `btsongmaps.provider.tsx` has a `previousNearbyDevicesRef` that is assigned but never read, and a 3-minute `songLoopIntervalRef` that calls `playSound` with the same id while it's already playing — `controls.ts` early-returns on `currentlyPlaying.id === id`, so the interval does nothing.
- `wifisongmaps.provider.tsx` requests `ACCESS_FINE_LOCATION` once at mount, then `getCurrentWifi` re-requests it (with the v33+ NEARBY_WIFI_DEVICES too) on every poll. The first call is redundant.

## Goals

- Eliminate the `FileSystem.writeAsStringAsync` call from the runtime path. No `expo-file-system` import in `controls.ts`.
- Drop `expo-background-task` and its task file.
- One module owns permission requests; providers consume from it.
- Remove dead code in providers.
- No regressions in the A/B/C scenarios. BT priority over WiFi is preserved. The 7s WiFi poll and 25s BT scan with 10s window are preserved.

## Non-goals

- No unification of the WiFi and BT providers — they reflect genuinely different mechanisms (cheap synchronous WiFi reads vs slow async BT scans).
- No state-machine rewrite, no Zustand restructure, no route changes.
- No support for case (D) (app swipe-killed).
- No notification format changes.

## Architecture

Unchanged in shape:

- `WiFiSongMappingProvider` — file-level singleton inside `app/_layout.tsx` tree; polls every 7s, plus reacts to `getCurrentWifi` calls from UI.
- `BluetoothSongMappingProvider` — same tree; scans every 25s with a 10s window via `react-native-ble-plx`.
- `lib/utils/controls.ts` — module-level audio singleton (`createAudioPlayer()` once). Exposes `playSound`, `stopSound`, `isPlaying`, `getCurrentlyPlaying`, `hasBluetoothPriority`, `markManualStop`, `isManualStop`, `AUDIO_SOURCE_TYPES`.
- `lib/utils/notifications.ts` — Now Playing notification with Stop action.

The foreground service is still held open by `audioPlayer` always playing silence at volume 0 when no mapped network/device is matched. The only difference is *where the silence comes from*.

## Concrete changes

### Bundled silence asset

Add `assets/audio/silence.wav` — 1 second mono PCM, ~5 KB, committed to the repo. Generated once via:

```
ffmpeg -f lavfi -i anullsrc=r=8000:cl=mono -t 1 -c:a pcm_u8 assets/audio/silence.wav
```

(or any equivalent — bytes are the same). Committed to the repo; not regenerated at runtime.

In `controls.ts`:

- Delete `buildSilentWav`, `ensureSilenceFile`, `silenceUri`.
- Delete the `import * as FileSystem from 'expo-file-system/legacy'` line.
- `startSilence` becomes:

```ts
const SILENCE_SOURCE = require('../../assets/audio/silence.wav');

const startSilence = (): void => {
  safe(() => audioPlayer.replace(SILENCE_SOURCE), 'replace(silence)');
  safe(() => { audioPlayer.loop = true; }, 'loop=true');
  safe(() => { audioPlayer.volume = 0; }, 'volume=0');
  safe(() => audioPlayer.updateLockScreenMetadata({ title: SILENCE_TITLE, artist: SILENCE_ARTIST }), 'updateLockScreenMetadata');
  safe(() => audioPlayer.play(), 'play(silence)');
};
```

`startSilence` is no longer async since there's no file I/O. `ensurePrimed` adapts: still async (because `setAudioModeAsync` is async), but the inner `await startSilence()` becomes a synchronous call. Callers of `startSilence()` in `stopSound` lose their `await`.

### Drop expo-background-task

- Delete `lib/tasks/background-wifi.ts`.
- Remove `import '@/lib/tasks/background-wifi';` from `app/_layout.tsx`.
- Remove `expo-background-task` from `package.json` `dependencies`.
- Remove `"expo-background-task"` from `app.json` `plugins`.
- Run `bun install` to update the lockfile.
- The native rebuild is required (next section).

### Permissions module

New file `lib/utils/permissions.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { type Permission, PermissionsAndroid, Platform } from 'react-native';
import { logger } from './logger';

const requestAndroid = async (perms: Permission[]): Promise<boolean> => {
  if (!perms.length) return true;
  const result = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
};

export const requestWifiPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const perms: Permission[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ];
  if (Platform.Version >= 33) perms.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  return requestAndroid(perms);
};

export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  return requestAndroid([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  } catch (error) {
    logger.warn('Permissions', 'Could not request notification permission', error);
    return false;
  }
};
```

`notifications.ts` no longer defines `requestNotificationPermission`. The function moves to `permissions.ts`. Implementation step grep's for `requestNotificationPermission` and updates each import site to point at `@/lib/utils/permissions`.

### Provider cleanup

`btsongmaps.provider.tsx`:

- Delete `previousNearbyDevicesRef` (declaration + the line in `checkForDisconnectedDevices` that assigns it; it's never read).
- Delete `songLoopIntervalRef`, the `setInterval(... 180000)` block in `checkForMappedDevices`, and the `clearInterval(songLoopIntervalRef.current)` calls in `stopContinuousScanning` and `deleteMapping`. The interval is a no-op given `controls.ts`'s id-based early return.
- Replace the inline `requestPermissions` callback with `requestBluetoothPermissions` from `permissions.ts`. Update call sites inside `scanForNearbyDevices`.

`wifisongmaps.provider.tsx`:

- Replace the inline `ensureWifiPermissions` callback with `requestWifiPermissions` from `permissions.ts`. Update call sites inside `getCurrentWifi`.
- In `setupWifiMonitoring`, drop the bare `PermissionsAndroid.request(ACCESS_FINE_LOCATION)` — the immediately-following `playSongForCurrentWifi(true)` triggers `getCurrentWifi`, which already requests permissions.

### app.json plugins

```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { ... }],
  "expo-audio",
  "expo-asset",
  "expo-notifications"
]
```

`expo-background-task` is removed.

### Native rebuild

The change to `package.json` deps and `app.json` plugins requires a fresh native build:

```
bun run build:android:dev
# or
expo run:android
```

The user verifies on device.

## Verification

Manual, on the user's Android device:

1. Foreground: connect to mapped WiFi → song plays. Disconnect → silence resumes.
2. While a song plays, switch to another app — song keeps playing. Confirms (B).
3. While a song plays, lock the screen — song keeps playing, lock-screen metadata visible. Confirms (C).
4. Bring a mapped BT device near while WiFi song plays — BT song takes over. Move BT device away — falls back to WiFi song (if still connected to mapped network) or silence.
5. Use the notification's Stop action — song stops, returns to silence loop.
6. `adb logcat | grep AudioControls` shows no `FileSystem.writeAsStringAsync` errors.
7. `bun run lint` and `bun run test` clean.

## Risk and rollback

- Risk 1: `audioPlayer.replace(require(...))` may need a different shape than a URI string. Verify with `expo-audio` docs — likely `replace({ uri: Asset.fromModule(...).uri })` or `replace(require(...))` directly. Implementation step writes a 5-line probe first.
- Risk 2: removing `expo-background-task` from `package.json` without rebuilding leaves stale native code. Mitigated by requiring a fresh build before testing.
- Risk 3: BT scan may behave differently without the no-op 3-min loop. Manual verification step (4) covers this.

Rollback is `git revert` of the commit. The change is contained to `controls.ts`, the two providers, `notifications.ts`, `app/_layout.tsx`, `app.json`, `package.json`, `bun.lock`, plus the new `permissions.ts` and `assets/audio/silence.wav`, plus the deleted `lib/tasks/background-wifi.ts`.
