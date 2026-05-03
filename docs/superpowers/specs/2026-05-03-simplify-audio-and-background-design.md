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

- `contexts/wifisongmaps.provider.tsx` and `contexts/btsongmaps.provider.tsx` are **dead code** — never mounted by `app/_layout.tsx`, never imported anywhere. Active code lives in `lib/stores/wifi-store.ts` (Zustand), `lib/stores/bt-store.ts` (Zustand), and `lib/hooks/useInitStores.ts` (lifecycle wiring). The orphan provider files mislead anyone reading the codebase.
- `lib/tasks/background-wifi.ts` registers an `expo-background-task` with a 15-minute minimum interval. That's only useful for case (D), which the user does not need; for cases (A/B/C) the foreground-service trick already handles things. The task is dead weight.
- Permission requests are duplicated across `lib/stores/wifi-store.ts` (`ensureWifiPermissions`), `lib/stores/bt-store.ts` (`requestPermissions`), `lib/hooks/useInitStores.ts` (a bare `PermissionsAndroid.request(ACCESS_FINE_LOCATION)`), and `lib/utils/notifications.ts` (`requestNotificationPermission`). Each re-implements the same pattern.
- `lib/stores/bt-store.ts` has a 3-minute `songLoopInterval` that calls `playSound` with the same id while it's already playing — `controls.ts` early-returns on `currentlyPlaying.id === id`, so the interval does nothing.
- `useInitStores.ts` requests `ACCESS_FINE_LOCATION` once at the top of `setup()`, then `playSongForCurrentWifi(true)` calls `getCurrentWifi` which calls `ensureWifiPermissions` again. The first call is redundant.

## Goals

- Eliminate the `FileSystem.writeAsStringAsync` call from the runtime path. No `expo-file-system` import in `controls.ts`.
- Drop `expo-background-task` and its task file.
- One module owns permission requests; stores consume from it.
- Delete dead Context provider files in `contexts/`.
- Remove the no-op 3-minute song loop in the BT store.
- No regressions in the A/B/C scenarios. BT priority over WiFi is preserved. The WiFi poll cadence and BT discovery/monitoring scan modes (10s/25s discovery, 3s/5s monitoring) are preserved.

## Non-goals

- No unification of WiFi and BT stores — they reflect genuinely different mechanisms (cheap synchronous WiFi reads vs slow async BT scans).
- No state-machine rewrite, no Zustand restructure beyond removing the dead loop, no route changes.
- No support for case (D) (app swipe-killed).
- No notification format changes.
- `lib/utils/backup.ts` also imports `expo-file-system/legacy`, but its calls only run on user-initiated backup/restore. Out of scope here. Tracked separately.

## Architecture

Unchanged in shape:

- `lib/stores/wifi-store.ts` — Zustand store with WiFi mappings, current SSID/BSSID, `playSongForCurrentWifi`, `getCurrentWifi`. Active path.
- `lib/stores/bt-store.ts` — Zustand store with BT mappings, nearby devices, scan modes, `currentPairedDevice`. Active path. Owns its own `BleManager` singleton.
- `lib/hooks/useInitStores.ts` — wires both stores up at mount: NetInfo subscription, AppState subscription, 7s WiFi poll, BT continuous scanning, plus the BT `nearbyDevices` reaction effect.
- `app/_layout.tsx` — renders `<StoreInitializer />` which calls `useInitStores()`. No providers.
- `lib/utils/controls.ts` — module-level audio singleton (`createAudioPlayer()` once). Exposes `playSound`, `stopSound`, `isPlaying`, `getCurrentlyPlaying`, `hasBluetoothPriority`, `markManualStop`, `isManualStop`, `AUDIO_SOURCE_TYPES`.
- `lib/utils/notifications.ts` — Now Playing notification with Stop action.

The foreground service is still held open by `audioPlayer` always playing silence at volume 0 when no mapped network/device is matched. The only difference is *where the silence comes from*.

## Concrete changes

### Bundled silence asset

`assets/sounds/silence.mp3` already exists (293 bytes) — use it. No new file needed.

In `controls.ts`:

- Delete `buildSilentWav`, `ensureSilenceFile`, `silenceUri`.
- Delete the `import * as FileSystem from 'expo-file-system/legacy'` line.
- `startSilence` becomes:

```ts
const SILENCE_SOURCE = require('../../assets/sounds/silence.mp3');

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
- Remove `import { registerBackgroundWifiTask } from '../tasks/background-wifi';` from `lib/hooks/useInitStores.ts` and the `registerBackgroundWifiTask();` call inside its first `useEffect`.
- Remove `expo-background-task` and `expo-task-manager` from `package.json` `dependencies` (`expo-task-manager` is only used by the deleted task).
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

`notifications.ts` no longer defines `requestNotificationPermission`. The function moves to `permissions.ts`. The single caller is `lib/hooks/useInitStores.ts` (line 14, line 30); update that import to `@/lib/utils/permissions`.

### Store and hook cleanup

`lib/stores/bt-store.ts`:

- Delete the module-level `let songLoopInterval: ReturnType<typeof setInterval> | null = null;`.
- Delete the `setInterval(... 180000)` block in `checkForMappedDevices` (the `songLoopInterval = setInterval(...)` statement and its body).
- Delete the `if (songLoopInterval) { clearInterval(songLoopInterval); songLoopInterval = null; }` blocks in `deleteMapping`, `checkForDisconnectedDevices`, and `stopContinuousScanning`.
- Delete the inline `requestPermissions` async function. Replace its call site in `scanForNearbyDevices` with `requestBluetoothPermissions` imported from `permissions.ts`.

`lib/stores/wifi-store.ts`:

- Delete the module-level `ensureWifiPermissions` async function. Replace its call site in `getCurrentWifi` with `requestWifiPermissions` imported from `permissions.ts`.

`lib/hooks/useInitStores.ts`:

- Delete the line `await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);` and the surrounding `if (Platform.OS === 'android')` guard at the top of `setup()`. The very next call (`playSongForCurrentWifi(true)`) triggers `getCurrentWifi`, which now calls `requestWifiPermissions`.
- Drop the now-unused `PermissionsAndroid, Platform` from the `react-native` import.
- Update the `requestNotificationPermission` import from `'../utils/notifications'` to `'../utils/permissions'`.

### Dead code removal

Delete the unused Context-based provider files entirely:

- `contexts/wifisongmaps.provider.tsx`
- `contexts/btsongmaps.provider.tsx`

Verify with `grep -rn "useWifiSongMapping\|useBluetoothSongMapping\|WiFiSongMappingProvider\|BluetoothSongMappingProvider" app components lib` returning nothing before removal.

If `contexts/` is empty after removal, delete the directory.

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

```sh
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

- Risk 1: `audioPlayer.replace(require(...))` may need a different shape than a URI string. The `expo-audio` `replace()` accepts a `require()`'d module asset directly (it implements `AudioSource` resolution). If the runtime balks, fall back to `replace({ uri: Asset.fromModule(require(...)).uri })`.
- Risk 2: removing `expo-background-task` and `expo-task-manager` from `package.json` without rebuilding leaves stale native code. Mitigated by requiring a fresh build before testing.
- Risk 3: BT scan may behave differently without the no-op 3-min loop. The manual verification step covers this.

Rollback is `git revert` of the relevant commits. Files touched: `lib/utils/controls.ts`, `lib/stores/wifi-store.ts`, `lib/stores/bt-store.ts`, `lib/hooks/useInitStores.ts`, `lib/utils/notifications.ts`, `app/_layout.tsx`, `app.json`, `package.json`, `bun.lock`. New: `lib/utils/permissions.ts`. Deleted: `lib/tasks/background-wifi.ts`, `contexts/wifisongmaps.provider.tsx`, `contexts/btsongmaps.provider.tsx`.
