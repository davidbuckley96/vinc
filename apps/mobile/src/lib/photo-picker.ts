import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Shared photo picker (G-05, docs/16). David chose the SIMPLE, native route:
 * a "Tirar foto / Escolher da galeria" chooser that opens the phone's own
 * camera (launchCameraAsync) or gallery — no custom camera component. The same
 * flow is used everywhere the app takes a photo (profile, service completion,
 * dispute), so the experience is identical and native.
 *
 * base64 is always requested: fetch(uri).blob() is broken in React Native and
 * uploads 0 bytes, so callers upload the decoded base64 bytes (F-07, docs/14).
 */
export interface PickedPhoto {
  uri: string;
  base64: string;
}

function toPhotos(assets: ImagePicker.ImagePickerAsset[]): PickedPhoto[] {
  return assets
    .filter((asset) => asset.base64)
    .map((asset) => ({ uri: asset.uri, base64: asset.base64! }));
}

async function fromCamera(edit: boolean): Promise<PickedPhoto[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('camera_denied');
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
    base64: true,
    allowsEditing: edit,
    aspect: edit ? [1, 1] : undefined,
  });
  return result.canceled ? [] : toPhotos(result.assets);
}

async function fromLibrary(multiple: boolean, limit: number, edit: boolean): Promise<PickedPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Editing (square crop) is incompatible with multi-select.
    allowsMultipleSelection: multiple && !edit,
    selectionLimit: limit,
    quality: 0.7,
    base64: true,
    allowsEditing: edit,
    aspect: edit ? [1, 1] : undefined,
  });
  return result.canceled ? [] : toPhotos(result.assets);
}

export interface ChoosePhotosOptions {
  /** Allow selecting more than one from the gallery (default false). */
  multiple?: boolean;
  /** Max selectable from the gallery (default 1). */
  limit?: number;
  /** Square crop with editing — for the profile avatar. */
  edit?: boolean;
  onResult: (photos: PickedPhoto[]) => void;
  /** Called if the camera permission is denied. */
  onCameraDenied?: () => void;
}

/**
 * Shows the native chooser and returns the picked photo(s) via onResult.
 * "Tirar foto" opens the OS camera; "Escolher da galeria" opens the OS gallery.
 */
export function choosePhotos({
  multiple = false,
  limit = 1,
  edit = false,
  onResult,
  onCameraDenied,
}: ChoosePhotosOptions): void {
  Alert.alert('Adicionar foto', undefined, [
    {
      text: 'Tirar foto',
      onPress: async () => {
        try {
          onResult(await fromCamera(edit));
        } catch {
          onCameraDenied?.();
        }
      },
    },
    {
      text: 'Escolher da galeria',
      onPress: async () => onResult(await fromLibrary(multiple, limit, edit)),
    },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
