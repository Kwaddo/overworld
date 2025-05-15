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
