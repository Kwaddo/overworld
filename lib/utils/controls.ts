import { type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState, Platform } from 'react-native';
import { logger } from './logger';
import { dismissNowPlayingNotification, showNowPlayingNotification } from './notifications';

const audioPlayer = createAudioPlayer();

// On iOS, re-activate the audio session when the app returns to foreground after an interruption
if (Platform.OS === 'ios') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && currentlyPlaying.isPlaying) {
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch((e) =>
        logger.warn('AudioControls', 'Failed to re-activate audio session', e),
      );
    }
  });
}

export const AUDIO_SOURCE_TYPES = {
  WIFI: 0,
  BLUETOOTH: 1,
} as const;

let currentlyPlaying = {
  id: null as string | null,
  isPlaying: false,
  type: 0,
  lastPlayedAt: 0,
};

let currentStatusListener: ((status: AudioStatus) => void) | null = null;

const FADE_DURATION_MS = 600;
const FADE_STEPS = 12;

const fadeOut = async (): Promise<void> => {
  const stepDelay = FADE_DURATION_MS / FADE_STEPS;
  for (let i = FADE_STEPS - 1; i >= 0; i--) {
    audioPlayer.volume = i / FADE_STEPS;
    await new Promise<void>((r) => setTimeout(r, stepDelay));
  }
};

const fadeIn = async (targetVolume = 1): Promise<void> => {
  const stepDelay = FADE_DURATION_MS / FADE_STEPS;
  for (let i = 1; i <= FADE_STEPS; i++) {
    audioPlayer.volume = (i / FADE_STEPS) * targetVolume;
    await new Promise<void>((r) => setTimeout(r, stepDelay));
  }
};

export const stopSound = async (): Promise<void> => {
  try {
    if (currentStatusListener) {
      audioPlayer.removeListener('playbackStatusUpdate', currentStatusListener);
      currentStatusListener = null;
    }

    if (currentlyPlaying.isPlaying) await fadeOut();
    await audioPlayer.pause();
    await audioPlayer.remove();
    audioPlayer.volume = 1;
    currentlyPlaying.isPlaying = false;
    dismissNowPlayingNotification();
  } catch (error) {
    logger.error('AudioControls', 'Error stopping sound', error);
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
  } = {},
): Promise<void> => {
  try {
    const { forceReplay = false, looping = false, volume = 1, notificationTitle } = options;
    const now = Date.now();

    if (!forceReplay && currentlyPlaying.isPlaying) {
      if (currentlyPlaying.id === id) {
        return;
      }
      if (
        type === AUDIO_SOURCE_TYPES.WIFI &&
        currentlyPlaying.type === AUDIO_SOURCE_TYPES.BLUETOOTH
      ) {
        return;
      }
    }

    await stopSound();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
    } catch (audioModeError) {
      logger.warn('AudioControls', 'Error setting audio mode', audioModeError);
    }

    audioPlayer.volume = 0;
    await audioPlayer.replace({ uri });
    audioPlayer.loop = looping;
    await audioPlayer.play();
    fadeIn(volume);

    currentlyPlaying = {
      id,
      isPlaying: true,
      lastPlayedAt: now,
      type,
    };

    if (notificationTitle) {
      const source = type === AUDIO_SOURCE_TYPES.BLUETOOTH ? 'Bluetooth' : 'WiFi';
      showNowPlayingNotification(notificationTitle, source);
    }

    if (currentStatusListener) {
      audioPlayer.removeListener('playbackStatusUpdate', currentStatusListener);
    }

    currentStatusListener = (status: AudioStatus) => {
      if (status.didJustFinish) {
        currentlyPlaying.isPlaying = false;

        if (currentStatusListener) {
          audioPlayer.removeListener('playbackStatusUpdate', currentStatusListener);
          currentStatusListener = null;
        }
      }
    };

    audioPlayer.addListener('playbackStatusUpdate', currentStatusListener);
  } catch (error) {
    logger.error('AudioControls', 'Error playing sound', error);
    currentlyPlaying.isPlaying = false;

    if (currentStatusListener) {
      audioPlayer.removeListener('playbackStatusUpdate', currentStatusListener);
      currentStatusListener = null;
    }
    return;
  }
};

/**
 * Check if audio is currently playing
 */
export const isPlaying = (id?: string): boolean => {
  if (id) {
    return currentlyPlaying.id === id && currentlyPlaying.isPlaying;
  }
  return currentlyPlaying.isPlaying;
};

/**
 * Get currently playing audio info
 */
export const getCurrentlyPlaying = () => {
  return { ...currentlyPlaying };
};

/**
 * Check if Bluetooth audio has priority over WiFi
 */
export const hasBluetoothPriority = (): boolean => {
  return currentlyPlaying.isPlaying && currentlyPlaying.type === AUDIO_SOURCE_TYPES.BLUETOOTH;
};
