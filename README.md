# Overworld: WiFi-Triggered Music Player 🎵

Overworld is a React Native mobile app that associates songs with WiFi networks. When you connect to a mapped WiFi network, your chosen song plays automatically, creating a personalized soundtrack for different locations.

## Features

- 🎵 Map songs to specific WiFi networks
- 🔄 Automatically play songs when connecting to mapped networks
- 🎧 Test mapped songs without switching networks
- 🗑️ Easily delete WiFi-song associations

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- Expo CLI (`npm install -g expo-cli`)
- Android device/emulator or iOS device/simulator

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/overworld.git
   cd overworld
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npx expo start
   ```

### Required Permissions

- **Android**: WiFi state access, location (for WiFi scanning), background services
- **iOS**: Background audio playback

## How It Works

1. **Connect** to a WiFi network
2. **Select** a song to associate with that network
3. **Enjoy** automatic playback whenever you connect to that network

## Project Structure

- `/app` - Main application screens using Expo Router
- `/components` - Reusable UI components
- `/contexts` - React context providers
- `/lib` - Utility functions and type definitions

## Development

For local development, you can build a development client:

```bash
npm run build:android:dev
```

Or a preview build:

```bash
npm run build:android:preview
```

## Learn More

For more information about the technologies used:

- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/docs/getting-started)
- [Expo Router](https://docs.expo.dev/router/introduction/)
