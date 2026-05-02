import type { Device } from 'react-native-ble-plx';

export interface BluetoothSongMapping {
  id: string;
  name: string;
  songUri: string;
  songName: string;
  volume: number;
}

export type BluetoothSongMap = {
  [id: string]: {
    name: string;
    songUri: string;
    songName: string;
    volume?: number;
  };
};

export interface BluetoothSongMappingContextType {
  mappings: BluetoothSongMapping[];
  saveMapping: (
    address: string,
    deviceName: string,
    songUri: string,
    songName: string,
  ) => Promise<boolean>;
  deleteMapping: (address: string) => Promise<boolean>;
  testMapping: (address: string) => Promise<boolean>;
  loadMappings: () => Promise<BluetoothSongMapping[]>;
  refreshMappings: () => void;
  nearbyDevices: Device[];
  scanForNearbyDevices: () => Promise<Device[]>;
  startContinuousScanning: () => void;
  stopContinuousScanning: () => void;
  isScanning: boolean;
  currentPairedDevice: { id: string; name: string } | null;
}
