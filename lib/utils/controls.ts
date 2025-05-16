import { Audio } from "expo-av";

let currentSound: Audio.Sound | null = null;
let currentlyPlaying = {
  id: null as string | null,
  isPlaying: false,
  lastPlayedAt: 0,
};

/**
 * Stops any currently playing sound
 */
export const stopSound = async (): Promise<void> => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
      currentlyPlaying.isPlaying = false;
    } catch (error) {
      console.error("Error stopping sound:", error);
    }
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
): Promise<void | Audio.Sound | null> => {
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
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
    } catch (audioModeError) {
      console.error("Error setting audio mode:", audioModeError);
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: looping }
    );

    currentlyPlaying = {
      id,
      isPlaying: true,
      lastPlayedAt: now,
    };

    currentSound = newSound;

    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        if (status.didJustFinish) {
          currentlyPlaying.isPlaying = false;
        } else if (!status.isPlaying && currentlyPlaying.isPlaying) {
          currentlyPlaying.isPlaying = false;
        }
      }
    });

    return newSound;
  } catch (error) {
    console.error("Error playing sound:", error);
    currentlyPlaying.isPlaying = false;
    currentSound = null;
    return null;
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
