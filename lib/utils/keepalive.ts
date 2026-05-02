import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { AppState } from 'react-native';
import { getCurrentlyPlaying, registerPrePlayHook } from './controls';
import { logger } from './logger';

const silencePlayer = createAudioPlayer();
let keepaliveActive = false;
let starting = false;
let silenceUri: string | null = null;
let currentAppState = AppState.currentState;

// Builds a minimal valid WAV: 1 second, 8kHz, 8-bit, mono.
// Generated at runtime so no binary asset is needed.
const buildSilentWav = (): Uint8Array => {
  const sampleRate = 8000;
  const numSamples = sampleRate;
  const buf = new Uint8Array(44 + numSamples);
  const dv = new DataView(buf.buffer);

  buf.set([82, 73, 70, 70], 0); // "RIFF"
  dv.setUint32(4, 36 + numSamples, true);
  buf.set([87, 65, 86, 69], 8); // "WAVE"
  buf.set([102, 109, 116, 32], 12); // "fmt "
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, 1, true); // mono
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate, true); // byte rate = sampleRate * 1 * 1
  dv.setUint16(32, 1, true); // block align
  dv.setUint16(34, 8, true); // bits per sample
  buf.set([100, 97, 116, 97], 36); // "data"
  dv.setUint32(40, numSamples, true);
  buf.fill(128, 44); // unsigned 8-bit PCM silence = 128

  return buf;
};

const ensureSilenceFile = async (): Promise<string> => {
  if (silenceUri) return silenceUri;

  const path = `${FileSystem.cacheDirectory}overworld_silence.wav`;
  const info = await FileSystem.getInfoAsync(path);

  if (!info.exists) {
    const wav = buildSilentWav();
    // btoa requires Latin-1 strings; fromCharCode maps byte values 0-255 correctly
    let latin1 = '';
    for (let i = 0; i < wav.length; i++) latin1 += String.fromCharCode(wav[i]);
    await FileSystem.writeAsStringAsync(path, btoa(latin1), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  silenceUri = path;
  return path;
};

const startKeepalive = async (): Promise<void> => {
  if (keepaliveActive || starting || getCurrentlyPlaying().isPlaying) return;
  starting = true;
  try {
    const uri = await ensureSilenceFile();
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    silencePlayer.volume = 0;
    await silencePlayer.replace({ uri });
    silencePlayer.loop = true;
    await silencePlayer.play();
    keepaliveActive = true;
    logger.info('Keepalive', 'Background keepalive started');
  } catch (e) {
    logger.warn('Keepalive', 'Could not start keepalive', e);
  } finally {
    starting = false;
  }
};

const stopKeepalive = async (): Promise<void> => {
  if (!keepaliveActive) return;
  try {
    await silencePlayer.pause();
    keepaliveActive = false;
    logger.info('Keepalive', 'Background keepalive stopped');
  } catch (e) {
    logger.warn('Keepalive', 'Could not stop keepalive', e);
  }
};

// Sync: keepalive runs only when backgrounded with no real audio.
const sync = (): void => {
  const inBackground = currentAppState === 'background' || currentAppState === 'inactive';
  const { isPlaying } = getCurrentlyPlaying();

  if (inBackground && !isPlaying) {
    startKeepalive();
  } else if (!inBackground || isPlaying) {
    stopKeepalive();
  }
};

AppState.addEventListener('change', (next) => {
  currentAppState = next;
  sync();
});

// Stop the silent player immediately when real audio is about to start.
registerPrePlayHook(stopKeepalive);

// Poll every second so keepalive stops quickly once a song starts playing.
setInterval(sync, 1000);
