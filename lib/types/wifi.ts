export type WifiSongMap = {
  [bssid: string]: {
    songUri: string;
    songName: string;
    wifiName: string;
  };
};

export type WifiSongMapping = {
  bssid: string;
  wifiName: string;
  songName: string;
  songUri: string;
};

export type WiFiSongMappingContextType = {
  mappings: WifiSongMapping[];
  currentWifi: {
    ssid: string;
    bssid: string | null;
  };
  loadMappings: () => Promise<WifiSongMapping[]>;
  getCurrentWifi: () => Promise<{
    ssid: string;
    bssid: string | null;
  }>;
  saveMapping: (
    bssid: string,
    ssid: string,
    songUri: string,
    songName: string
  ) => Promise<boolean>;
  deleteMapping: (bssid: string) => Promise<boolean>;
  playSongForCurrentWifi: () => Promise<void>;
  testMapping: (bssid: string) => Promise<boolean>;
  refreshMappings: () => void;
};
