import {
  deleteMappingWifiUtil,
  getMappingByBSSID,
  loadMappingsWifiUtil,
  saveMappingWifiUtil,
} from '../lib/utils/wiifmapping';

const mockStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => {
    delete mockStore[k];
  });
});

describe('loadMappingsWifiUtil', () => {
  it('returns empty array when no data stored', async () => {
    const result = await loadMappingsWifiUtil();
    expect(result).toEqual([]);
  });

  it('returns stored mappings as array', async () => {
    mockStore.wifi_song_mappings = JSON.stringify({
      'aa:bb:cc': { songUri: 'file://song.mp3', songName: 'Song', wifiName: 'Home' },
    });
    const result = await loadMappingsWifiUtil();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      bssid: 'aa:bb:cc',
      songUri: 'file://song.mp3',
      songName: 'Song',
      wifiName: 'Home',
      volume: 1,
    });
  });
});

describe('saveMappingWifiUtil', () => {
  it('saves a new mapping', async () => {
    const ok = await saveMappingWifiUtil('aa:bb:cc', 'Home', 'file://a.mp3', 'Track A');
    expect(ok).toBe(true);
    const stored = JSON.parse(mockStore.wifi_song_mappings);
    expect(stored['aa:bb:cc']).toEqual({
      songUri: 'file://a.mp3',
      songName: 'Track A',
      wifiName: 'Home',
      volume: 1,
    });
  });

  it('overwrites an existing mapping for the same BSSID', async () => {
    await saveMappingWifiUtil('aa:bb:cc', 'Home', 'file://a.mp3', 'Track A');
    await saveMappingWifiUtil('aa:bb:cc', 'Home', 'file://b.mp3', 'Track B');
    const stored = JSON.parse(mockStore.wifi_song_mappings);
    expect(stored['aa:bb:cc'].songName).toBe('Track B');
  });
});

describe('deleteMappingWifiUtil', () => {
  it('removes an existing mapping', async () => {
    await saveMappingWifiUtil('aa:bb:cc', 'Home', 'file://a.mp3', 'Track A');
    const ok = await deleteMappingWifiUtil('aa:bb:cc');
    expect(ok).toBe(true);
    const stored = JSON.parse(mockStore.wifi_song_mappings);
    expect(stored['aa:bb:cc']).toBeUndefined();
  });

  it('returns true even when BSSID does not exist', async () => {
    const ok = await deleteMappingWifiUtil('not-a-real-bssid');
    expect(ok).toBe(true);
  });
});

describe('getMappingByBSSID', () => {
  it('returns null when no mapping exists', async () => {
    const result = await getMappingByBSSID('aa:bb:cc');
    expect(result).toBeNull();
  });

  it('returns the mapping when it exists', async () => {
    await saveMappingWifiUtil('aa:bb:cc', 'Home', 'file://a.mp3', 'Track A');
    const result = await getMappingByBSSID('aa:bb:cc');
    expect(result).toEqual({
      songUri: 'file://a.mp3',
      songName: 'Track A',
      wifiName: 'Home',
      volume: 1,
    });
  });
});
