import {
  deleteMappingBTUtil,
  getMappingByID,
  loadMappingsBTUtil,
  saveMappingBTUtil,
} from '../lib/utils/btmapping';

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

describe('loadMappingsBTUtil', () => {
  it('returns empty array when no data stored', async () => {
    const result = await loadMappingsBTUtil();
    expect(result).toEqual([]);
  });

  it('returns stored mappings as array', async () => {
    mockStore['bluetooth_song_mappings'] = JSON.stringify({
      'device-001': { name: 'My Phone', songUri: 'file://song.mp3', songName: 'Song' },
    });
    const result = await loadMappingsBTUtil();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'device-001',
      name: 'My Phone',
      songUri: 'file://song.mp3',
      songName: 'Song',
      volume: 1,
    });
  });
});

describe('saveMappingBTUtil', () => {
  it('saves a new BT mapping', async () => {
    const ok = await saveMappingBTUtil('device-001', 'My Phone', 'file://a.mp3', 'Track A');
    expect(ok).toBe(true);
    const stored = JSON.parse(mockStore['bluetooth_song_mappings']);
    expect(stored['device-001']).toEqual({
      name: 'My Phone',
      songUri: 'file://a.mp3',
      songName: 'Track A',
      volume: 1,
    });
  });
});

describe('deleteMappingBTUtil', () => {
  it('removes an existing BT mapping', async () => {
    await saveMappingBTUtil('device-001', 'My Phone', 'file://a.mp3', 'Track A');
    const ok = await deleteMappingBTUtil('device-001');
    expect(ok).toBe(true);
    const stored = JSON.parse(mockStore['bluetooth_song_mappings']);
    expect(stored['device-001']).toBeUndefined();
  });
});

describe('getMappingByID', () => {
  it('returns null when no mapping exists', async () => {
    const result = await getMappingByID('device-001');
    expect(result).toBeNull();
  });

  it('returns the mapping when it exists', async () => {
    await saveMappingBTUtil('device-001', 'My Phone', 'file://a.mp3', 'Track A');
    const result = await getMappingByID('device-001');
    expect(result).toEqual({
      name: 'My Phone',
      songUri: 'file://a.mp3',
      songName: 'Track A',
      volume: 1,
    });
  });
});
