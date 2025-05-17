import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

// Create a global audio player instance
const audioPlayer = createAudioPlayer();

let currentlyPlaying = {
  id: null as string | null,
  isPlaying: false,
  lastPlayedAt: 0,
};

/**
 * Stops any currently playing sound
 */
export const stopSound = async (): Promise<void> => {
  try {
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
 * @param id Identifier for the sound (e.g., WiFi BSSID)
 * @param options Additional playback options
 */
export const playSound = async (
  uri: string,
  id: string,
  options: {
    forceReplay?: boolean;
    looping?: boolean;
  } = {}
): Promise<void> => {
  try {
    const { forceReplay = false, looping = false } = options;
    const now = Date.now();

    if (
      !forceReplay &&
      currentlyPlaying.id === id &&
      currentlyPlaying.isPlaying
    ) {
      return;
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
    };

    const statusCheckInterval = setInterval(() => {
      if (!audioPlayer.playing && currentlyPlaying.isPlaying) {
        currentlyPlaying.isPlaying = false;
        clearInterval(statusCheckInterval);
      }
    }, 500);
  } catch (error) {
    console.error("Error playing sound:", error);
    currentlyPlaying.isPlaying = false;
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
