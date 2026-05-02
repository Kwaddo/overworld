# Overworld — Claude Code Reference

## What this app does
WiFi-triggered and Bluetooth-triggered music player for Android/iOS. When the device joins a mapped WiFi network or detects a mapped BLE device nearby, the corresponding song plays automatically. BT takes priority over WiFi.

## Tech stack
- **Framework**: Expo 54 (React Native 0.81, React 19), New Architecture enabled
- **Routing**: Expo Router (file-based, typed routes)
- **Language**: TypeScript strict mode
- **Linter/Formatter**: Biome — run `bun run lint`, auto-fix with `bun run format`
- **State**: React Context (WiFi and BT providers), see `contexts/`
- **Storage**: `expo-secure-store` (encrypted JSON blobs)
- **Audio**: `expo-audio` singleton in `lib/utils/controls.ts`
- **WiFi**: `react-native-wifi-reborn` + `@react-native-community/netinfo`
- **BLE**: `react-native-ble-plx`
- **Builds**: EAS (`eas.json`) — development / preview / staging / production profiles
- **Package manager**: bun (`bun.lock` is the lockfile)

## Project layout
```
app/
  _layout.tsx           # Root — mounts BT + WiFi providers
  (tabs)/
    index.tsx           # Overworld tab (WiFi mappings)
    encounters.tsx      # Encounters tab (BT devices)
    info.tsx            # Info/help + Import/Export
components/
  ui/                   # ds-text, polka-dot-background, tabbar-icon, error-boundary
  world/                # current-wifi-card, wifi-list
  encounters/           # bluetooth-list
contexts/
  wifisongmaps.provider.tsx
  btsongmaps.provider.tsx
lib/
  hooks/                # useColorScheme, useDocumentPicker, useSecureStore
  stores/               # Zustand stores (wifi-store, bt-store)
  types/                # wifi.ts, ble.ts
  utils/
    controls.ts         # Audio singleton (playSound / stopSound / fade)
    wiifmapping.ts      # WiFi SecureStore CRUD
    btmapping.ts        # BT SecureStore CRUD
    backup.ts           # Import/Export JSON via Share sheet
    logger.ts           # Structured logger (dev console, prod silent)
```

## Key invariants
- BT audio always overrides WiFi: `hasBluetoothPriority()` in `controls.ts`
- Audio player is a module-level singleton (`createAudioPlayer()` called once at module load)
- WiFi detection runs on a 7-second interval AND on netinfo network-change events
- BLE scanning runs on a 25-second interval with a 10-second scan window
- Secure store keys: `wifi_song_mappings`, `bluetooth_song_mappings`
- Fonts: `NintendoDSBIOS` (Nintendo DS BIOS TTF) — used via `DSText` component everywhere

## Design system
- All text must use `<DSText>` — never bare `<Text>`
- Colors: import from `@/constants/Colors` → `LightColors`
- Background: always `<PolkaDotBackground>` as screen root
- Font sizes: 32–34 for titles, 22–28 for headers, 14–18 for body

## Common commands
```bash
bun start                          # Expo dev server
bun run lint                       # Biome check
bun run format                     # Biome format --write
bun run test                       # Jest tests
bun run build:android:dev          # Local dev build
bun run build:android:preview      # Preview APK
bun run build:android:production   # Production AAB
bun run version:bump               # Bump version + git tag
```

## Things to avoid
- Never use bare `<Text>` — always `<DSText>`
- Never call `new BleManager()` outside of `btsongmaps.provider.tsx`
- Never import `expo-audio` directly in components — use `controls.ts`
- Never duplicate SecureStore keys — define constants in the mapping utils
- Biome enforces single quotes, 2-space indent, 100-char line width
