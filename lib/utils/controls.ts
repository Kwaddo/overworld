import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const audioPlayer = createAudioPlayer();

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

let currentStatusListener: ((status: any) => void) | null = null;

/**
 * Stops any currently playing sound
 */
export const stopSound = async (): Promise<void> => {
  try {
    if (currentStatusListener) {
      audioPlayer.removeListener("playbackStatusUpdate", currentStatusListener);
      currentStatusListener = null;
    }

    await audioPlayer.pause();
    await audioPlayer.remove();
    currentlyPlaying.isPlaying = false;
  } catch (error) {
    console.error("Error stopping sound:", error);
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
  } = {}
): Promise<void> => {
  try {
    const { forceReplay = false, looping = false } = options;
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
      console.error("Error setting audio mode:", audioModeError);
    }

    await audioPlayer.replace({ uri });
    audioPlayer.loop = looping;
    await audioPlayer.play();

    currentlyPlaying = {
      id,
      isPlaying: true,
      lastPlayedAt: now,
      type,
    };

    if (currentStatusListener) {
      audioPlayer.removeListener("playbackStatusUpdate", currentStatusListener);
    }

    currentStatusListener = (status: any) => {
      if (
        status.didJustFinish === true ||
        (status.isLoaded === false && status.error)
      ) {
        currentlyPlaying.isPlaying = false;

        if (currentStatusListener) {
          audioPlayer.removeListener(
            "playbackStatusUpdate",
            currentStatusListener
          );
          currentStatusListener = null;
        }
      }
    };

    audioPlayer.addListener("playbackStatusUpdate", currentStatusListener);
  } catch (error) {
    console.error("Error playing sound:", error);
    currentlyPlaying.isPlaying = false;

    if (currentStatusListener) {
      audioPlayer.removeListener("playbackStatusUpdate", currentStatusListener);
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
  return (
    currentlyPlaying.isPlaying &&
    currentlyPlaying.type === AUDIO_SOURCE_TYPES.BLUETOOTH
  );
};
