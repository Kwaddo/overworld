export interface BluetoothSongMapping {
  id: string;
  name: string;
  songUri: string;
  songName: string;
}

export type BluetoothSongMap = {
  [id: string]: {
    name: string;
    songUri: string;
    songName: string;
  };
};

export interface BluetoothSongMappingContextType {
  mappings: BluetoothSongMapping[];
  saveMapping: (
    address: string,
    deviceName: string,
    songUri: string,
    songName: string
  ) => Promise<boolean>;
  deleteMapping: (address: string) => Promise<boolean>;
  testMapping: (address: string) => Promise<boolean>;
  loadMappings: () => Promise<BluetoothSongMapping[]>;
  refreshMappings: () => void;
}
