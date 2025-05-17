import * as DocumentPicker from "expo-document-picker";

export const DocumentPickerAdapter = {
  getDocument: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  },
};
