import {
  AUDIO_SOURCE_TYPES,
  getCurrentlyPlaying,
  hasBluetoothPriority,
  isPlaying,
} from '../lib/utils/controls';

const mockPlayer = {
  replace: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  loop: false,
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('isPlaying', () => {
  it('returns false initially', () => {
    expect(isPlaying()).toBe(false);
  });
});

describe('hasBluetoothPriority', () => {
  it('returns false when nothing is playing', () => {
    expect(hasBluetoothPriority()).toBe(false);
  });
});

describe('getCurrentlyPlaying', () => {
  it('returns a snapshot object', () => {
    const state = getCurrentlyPlaying();
    expect(state).toHaveProperty('id');
    expect(state).toHaveProperty('isPlaying');
    expect(state).toHaveProperty('type');
    expect(state).toHaveProperty('lastPlayedAt');
  });

  it('returns a copy — mutations do not affect internal state', () => {
    const state = getCurrentlyPlaying();
    state.isPlaying = true;
    expect(isPlaying()).toBe(false);
  });
});

describe('AUDIO_SOURCE_TYPES', () => {
  it('has WIFI = 0 and BLUETOOTH = 1', () => {
    expect(AUDIO_SOURCE_TYPES.WIFI).toBe(0);
    expect(AUDIO_SOURCE_TYPES.BLUETOOTH).toBe(1);
  });
});
