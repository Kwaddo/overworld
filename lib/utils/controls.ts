import { type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState } from 'react-native';
import { logger } from './logger';
import { dismissNowPlayingNotification, showNowPlayingNotification } from './notifications';

// One audio player, always playing. When idle it loops silence at volume 0;
// when a mapped network/device fires it swaps to the real song via replace().
//
// Why "always playing": expo-audio's AudioControlsService is a foreground
// media-playback service (foregroundServiceType=mediaPlayback) that's started
// the moment we call setActiveForLockScreen(true). As long as the MediaSession
// stays attached AND a player is playing, Android won't Doze-suspend the JS
// thread — which is what keeps NetInfo events firing in the background.
//
// We never call audioPlayer.remove() — that destroys the player and leaves
// every subsequent replace()/play() operating on a dead reference.
const audioPlayer = createAudioPlayer();

// Bundled 1-second silent WAV (8 kHz, 8-bit, mono). Using a static asset
// avoids any expo-file-system writes and the native class resolution issues
// that can affect the legacy FileSystem API across dev-build version mismatches.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SILENCE_SOURCE = require('../../assets/audio/silence.wav') as number;

let primed = false;
let primingPromise: Promise<void> | null = null;

const SILENCE_TITLES = [
  'Listening for networks…',
  "Seeing which part of the world you're in…",
  'Sniffing around for signal…',
  'Tuning into the airwaves…',
  'Checking the encounter table…',
  'Mapping your overworld…',
  'Wandering the airwaves…',
  'Reading the vibes…',
  'Scanning the area…',
  'Searching for nearby friends…',
  'Triangulating your whereabouts…',
  'Listening to the wind…',
  'Where are we today?',
  'Peeking at the routers…',
  'Waiting for a wild network…',
];
const SILENCE_ARTIST = 'Overworld';
let currentSilenceTitle = SILENCE_TITLES[0];
const pickSilenceTitle = (): string => {
  // Avoid repeating the same line back-to-back when more than one is available.
  if (SILENCE_TITLES.length <= 1) return SILENCE_TITLES[0];
  let next = currentSilenceTitle;
  while (next === currentSilenceTitle) {
    next = SILENCE_TITLES[Math.floor(Math.random() * SILENCE_TITLES.length)];
  }
  currentSilenceTitle = next;
  return next;
};

// Each native call individually try/caught — a single failed setter must
// not abort the whole play/stop flow.
const safe = <T>(fn: () => T, label: string): T | undefined => {
  try {
    return fn();
  } catch (e) {
    logger.warn('AudioControls', `${label} failed`, e);
    return undefined;
  }
};

const startSilence = (): void => {
  const title = pickSilenceTitle();
  safe(() => {
    audioPlayer.replace(SILENCE_SOURCE);
  }, 'replace(silence)');
  safe(() => {
    audioPlayer.loop = true;
  }, 'loop=true');
  safe(() => {
    audioPlayer.volume = 0;
  }, 'volume=0');
  safe(() => {
    audioPlayer.updateLockScreenMetadata({ title, artist: SILENCE_ARTIST });
  }, 'updateLockScreenMetadata');
  safe(() => {
    audioPlayer.play();
  }, 'play(silence)');
  // Re-assert after the source load completes — replace() resolves the new
  // MediaItem asynchronously and can overwrite our metadata when it lands.
  setTimeout(() => {
    safe(() => {
      audioPlayer.updateLockScreenMetadata({ title, artist: SILENCE_ARTIST });
    }, 'updateLockScreenMetadata(silence re-assert)');
  }, 250);
};

// Prime once: configure audio mode, claim the foreground service, start
// silent playback. Idempotent. playSound/stopSound await this.
const ensurePrimed = async (): Promise<void> => {
  if (primed) return;
  if (primingPromise) return primingPromise;
  primingPromise = (async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
      // Claim the lock screen FIRST — boots the AudioControlsService as a
      // foreground media-playback service so subsequent replace/play calls
      // happen with the service already alive.
      safe(() => {
        audioPlayer.setActiveForLockScreen(true, {
          title: currentSilenceTitle,
          artist: SILENCE_ARTIST,
        });
      }, 'setActiveForLockScreen');
      startSilence();
      primed = true;
    } catch (e) {
      logger.warn('AudioControls', 'Could not prime audio player', e);
    } finally {
      primingPromise = null;
    }
  })();
  return primingPromise;
};

// Tracks the ID of a song the user explicitly stopped via the notification.
let manualStopId: string | null = null;
export const markManualStop = (id: string): void => {
  manualStopId = id;
};
export const isManualStop = (id: string): boolean => manualStopId === id;

export const AUDIO_SOURCE_TYPES = {
  WIFI: 0,
  BLUETOOTH: 1,
} as const;

let currentlyPlaying = {
  id: null as string | null,
  isPlaying: false,
  type: 0,
  lastPlayedAt: 0,
  songName: null as string | null,
  networkName: null as string | null,
};

// Re-assert audio focus when returning to foreground (another app may have
// stolen it) and also re-prime in case the OS torn things down.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true })
      .then(() => safe(() => audioPlayer.play(), 'play(resume)'))
      .catch((e) => logger.warn('AudioControls', 'Failed to resume on foreground', e));
  }
  if ((state === 'background' || state === 'inactive') && !currentlyPlaying.isPlaying) {
    dismissNowPlayingNotification();
  }
});

// Boot the foreground service immediately at module load.
ensurePrimed();

// When a non-looping song finishes, reset our tracking state and restart the
// silent loop. Without this, currentlyPlaying.isPlaying stays true forever after
// the song ends, causing playSound's idempotency guard to skip every subsequent
// attempt to replay — the network is "forgotten" until a force-play is triggered.
audioPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
  if (status.didJustFinish && currentlyPlaying.isPlaying) {
    currentlyPlaying.isPlaying = false;
    currentlyPlaying.id = null;
    currentlyPlaying.songName = null;
    currentlyPlaying.networkName = null;
    dismissNowPlayingNotification();
    startSilence();
  }
});

// Exported so callers that depend on the foreground service being alive (e.g. BLE scanning)
// can await it before proceeding. Safe to call multiple times — idempotent.
export const waitForAudioReady = (): Promise<void> => ensurePrimed();

export const stopSound = async (): Promise<void> => {
  try {
    await ensurePrimed();

    const wasPlaying = currentlyPlaying.isPlaying;
    currentlyPlaying.isPlaying = false;
    currentlyPlaying.id = null;
    currentlyPlaying.songName = null;
    currentlyPlaying.networkName = null;
    dismissNowPlayingNotification();

    if (!wasPlaying) return;
    startSilence();
  } catch (error) {
    logger.error('AudioControls', 'Error stopping sound', error);
    currentlyPlaying.isPlaying = false;
    currentlyPlaying.id = null;
    currentlyPlaying.songName = null;
    currentlyPlaying.networkName = null;
    dismissNowPlayingNotification();
  }
};

/**
 * Plays audio from the provided URI
 * @param uri URI of the audio file to play
 * @param id Identifier for the sound (e.g., WiFi BSSID or Bluetooth device ID)
 * @param type Audio source type (0 = WiFi, 1 = Bluetooth)
 * @param options Additional playback options
 */
export const playSound = async (
  uri: string,
  id: string,
  type: number,
  options: {
    forceReplay?: boolean;
    looping?: boolean;
    volume?: number;
    notificationTitle?: string;
    networkName?: string;
  } = {},
): Promise<void> => {
  try {
    await ensurePrimed();

    const {
      forceReplay = false,
      looping = false,
      volume = 1,
      notificationTitle,
      networkName,
    } = options;

    if (!forceReplay && currentlyPlaying.isPlaying) {
      if (currentlyPlaying.id === id) return;
      if (
        type === AUDIO_SOURCE_TYPES.WIFI &&
        currentlyPlaying.type === AUDIO_SOURCE_TYPES.BLUETOOTH
      ) {
        return;
      }
    }

    manualStopId = null;
    const source = type === AUDIO_SOURCE_TYPES.BLUETOOTH ? 'Bluetooth' : 'WiFi';

    const lockTitle = notificationTitle ?? 'Overworld';
    safe(() => {
      audioPlayer.replace({ uri });
    }, 'replace(song)');
    safe(() => {
      audioPlayer.loop = looping;
    }, 'set loop');
    safe(() => {
      audioPlayer.volume = volume;
    }, 'set volume');
    safe(() => {
      audioPlayer.updateLockScreenMetadata({ title: lockTitle, artist: source });
    }, 'updateLockScreenMetadata');
    safe(() => {
      audioPlayer.play();
    }, 'play(song)');
    // The source load from replace() resolves async on Android — without this
    // re-assert, the post-load MediaSession refresh can leave the previous
    // (silence) title visible on the notification.
    setTimeout(() => {
      if (currentlyPlaying.id !== id || !currentlyPlaying.isPlaying) return;
      safe(() => {
        audioPlayer.updateLockScreenMetadata({ title: lockTitle, artist: source });
      }, 'updateLockScreenMetadata(song re-assert)');
    }, 250);

    currentlyPlaying = {
      id,
      isPlaying: true,
      lastPlayedAt: Date.now(),
      type,
      songName: notificationTitle ?? null,
      networkName: networkName ?? null,
    };

    if (notificationTitle) {
      showNowPlayingNotification(notificationTitle, source);
    }
  } catch (error) {
    logger.error('AudioControls', 'Error playing sound', error);
    currentlyPlaying.isPlaying = false;
    currentlyPlaying.id = null;
  }
};

export const isPlaying = (id?: string): boolean => {
  if (id) return currentlyPlaying.id === id && currentlyPlaying.isPlaying;
  return currentlyPlaying.isPlaying;
};

export const getCurrentlyPlaying = () => ({ ...currentlyPlaying });

export const hasBluetoothPriority = (): boolean =>
  currentlyPlaying.isPlaying && currentlyPlaying.type === AUDIO_SOURCE_TYPES.BLUETOOTH;
