const { withAndroidManifest } = require('@expo/config-plugins');

// Patches the expo-audio AudioControlsService to also declare foregroundServiceType=connectedDevice.
// Android 14+ validates that a foreground service's declared type matches its actual capabilities.
// Without connectedDevice type, BLE scanning from the background foreground service is blocked.
module.exports = function withBleConnectedDeviceService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure xmlns:tools is declared so tools:replace is valid during manifest merge.
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Add FOREGROUND_SERVICE_CONNECTED_DEVICE permission required on Android 14+.
    const permissions = manifest.manifest['uses-permission'] ?? [];
    const connectedDevicePerm = 'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE';
    if (!permissions.some((p) => p.$?.['android:name'] === connectedDevicePerm)) {
      permissions.push({ $: { 'android:name': connectedDevicePerm } });
      manifest.manifest['uses-permission'] = permissions;
    }

    // Override AudioControlsService foregroundServiceType to add connectedDevice alongside
    // the existing mediaPlayback type. tools:replace tells the Gradle manifest merger to
    // use our value instead of expo-audio's default.
    const app = manifest.manifest.application[0];
    const services = app.service ?? [];
    const audioServiceClass = 'expo.modules.audio.service.AudioControlsService';

    if (!services.some((s) => s.$?.['android:name'] === audioServiceClass)) {
      services.push({
        $: {
          'android:name': audioServiceClass,
          'android:foregroundServiceType': 'mediaPlayback|connectedDevice',
          'tools:replace': 'android:foregroundServiceType',
          'tools:node': 'merge',
        },
      });
      app.service = services;
    }

    return config;
  });
};
