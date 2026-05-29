import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { logout } from '@/services/auth';
import {
  createInspectionItem,
  getStoredInspections,
  INSPECTION_SERVICE_TYPES,
  InspectionImage,
  InspectionItem,
  InspectionServiceType,
  saveInspectionOffline,
  syncInspection,
  updateInspectionOffline,
} from '@/services/inspections';

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

const extractPlateFromUri = (uri: string) => {
  const match = uri.toUpperCase().match(/[A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{2}[A-Z]/);
  return match?.[0] ?? '';
};

const getImageName = (uri: string, index: number, fileName?: string | null) => {
  if (fileName) {
    return fileName;
  }

  const name = uri.split('/').pop()?.split('?')[0];
  return name || `inspeccion-${index + 1}.jpg`;
};

const getImageType = (uri: string, mimeType?: string | null) => {
  if (mimeType?.startsWith('image/')) {
    return mimeType;
  }

  const extension = uri.split('.').pop()?.toLowerCase().split('?')[0];

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
};

const toDataUri = (base64: string | null | undefined, type: string) => {
  if (!base64) {
    return null;
  }

  return base64.startsWith('data:') ? base64 : `data:${type};base64,${base64}`;
};

const pickImage = async ({ base64 = false }: { base64?: boolean } = {}) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

    if (!cameraPermission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a la cámara.');
      return null;
    }

    return ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: base64 ? 0.7 : 0.8,
      base64,
    });
  }

  const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!mediaLibraryPermission.granted) {
    Alert.alert('Permiso requerido', 'Debes permitir acceso a las imágenes.');
    return null;
  }

  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: base64 ? 0.7 : 0.8,
    base64,
  });
};

export default function NewInspectionScreen() {
  const { inspectionId } = useLocalSearchParams<{ inspectionId?: string }>();
  const [editingInspection, setEditingInspection] = useState<InspectionItem | null>(null);
  const [placa, setPlaca] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [tipoServicio, setTipoServicio] = useState<InspectionServiceType>('Avaluo');
  const [isServiceSelectOpen, setIsServiceSelectOpen] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [imagenes, setImagenes] = useState<InspectionImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [creationAlertMessage, setCreationAlertMessage] = useState('');
  const [isCreationAlertVisible, setIsCreationAlertVisible] = useState(false);

  useEffect(() => {
    const loadInspection = async () => {
      if (!inspectionId) {
        setEditingInspection(null);
        setPlaca('');
        setKilometraje('');
        setTipoServicio('Avaluo');
        setIsServiceSelectOpen(false);
        setObservaciones('');
        setImagenes([]);
        return;
      }

      const inspections = await getStoredInspections();
      const inspection = inspections.find((item) => item.id === inspectionId);

      if (!inspection) {
        Alert.alert('Inspección no encontrada', 'No se encontró la inspección guardada en este dispositivo.');
        router.replace('/');
        return;
      }

      setEditingInspection(inspection);
      setPlaca(inspection.placa);
      setKilometraje(inspection.kilometraje);
      setTipoServicio(inspection.tipoServicio);
      setIsServiceSelectOpen(false);
      setObservaciones(inspection.observaciones);
      setImagenes(inspection.imagenes);
    };

    void loadInspection();
  }, [inspectionId]);

  const capturarPlaca = async () => {
    const result = await pickImage();

    if (result && !result.canceled && result.assets[0]?.uri) {
      const detectedPlate = extractPlateFromUri(result.assets[0].uri);
      if (detectedPlate) {
        setPlaca(detectedPlate);
        Alert.alert('Placa detectada', `Se reconoció: ${detectedPlate}`);
      } else {
        Alert.alert('Sin reconocimiento automático', 'No se pudo reconocer la placa automáticamente. Puedes escribirla manualmente.');
      }
    }
  };

  const agregarImagen = async () => {
    if (imagenes.length >= 10) {
      Alert.alert('Límite alcanzado', 'Solo se permiten 10 imágenes por inspección.');
      return;
    }

    const result = await pickImage({ base64: true });

    if (result && !result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      const index = imagenes.length;
      const type = getImageType(asset.uri, asset.mimeType);
      const image: InspectionImage = {
        uri: asset.uri,
        name: getImageName(asset.uri, index, asset.fileName),
        type,
        dataUri: toDataUri(asset.base64, type),
      };

      setImagenes((prev) => [...prev, image]);
    }
  };

  const resetForm = () => {
    setEditingInspection(null);
    setPlaca('');
    setKilometraje('');
    setTipoServicio('Avaluo');
    setIsServiceSelectOpen(false);
    setObservaciones('');
    setImagenes([]);
  };

  const getSyncFailureMessage = (inspection: InspectionItem) => (
    `La inspección quedó guardada en este dispositivo, pero no se pudo sincronizar ahora.${inspection.lastSyncError ? ` Detalle: ${inspection.lastSyncError}` : ''} Intenta nuevamente cuando tengas internet.`
  );

  const guardar = async () => {
    if (isSaving) {
      return;
    }

    if (!placa.trim()) {
      Alert.alert('Campo requerido', 'Debes ingresar o capturar una placa.');
      return;
    }

    const isEditing = Boolean(editingInspection);
    const inspectionData = {
      placa: normalizePlate(placa),
      kilometraje,
      tipoServicio,
      observaciones,
      imagenes,
    };

    setIsSaving(true);

    try {
      const savedItem = editingInspection
        ? await updateInspectionOffline({ ...editingInspection, ...inspectionData })
        : await saveInspectionOffline(createInspectionItem(inspectionData));

      const syncedItem = await syncInspection(savedItem);

      if (syncedItem.syncStatus !== 'sent') {
        Alert.alert('No se pudo sincronizar', getSyncFailureMessage(syncedItem));
        return;
      }

      if (!isEditing) {
        setCreationAlertMessage('Ingreso móvil creado correctamente. ¿Deseas crear uno nuevo?');
        setIsCreationAlertVisible(true);
        return;
      }

      Alert.alert('Inspección actualizada', 'La inspección se actualizó correctamente.', [
        { text: 'Aceptar', onPress: () => router.replace('/') },
      ]);
    } catch {
      Alert.alert(
        'No se pudo guardar',
        'Ocurrió un error al guardar la inspección. Intenta nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const crearOtro = () => {
    setIsCreationAlertVisible(false);
    setCreationAlertMessage('');
    resetForm();
  };

  const irAlListado = () => {
    setIsCreationAlertVisible(false);
    setCreationAlertMessage('');
    router.replace('/');
  };

  const cancelar = () => {
    router.replace('/');
  };

  const cerrarSesion = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}></Text>
          <Pressable style={styles.logoutButton} onPress={cerrarSesion}>
            <Ionicons name="log-out-outline" size={22} color="#FFF" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <View style={styles.formContent}>
          <Text style={styles.title}>{editingInspection ? 'Editar inspección' : 'Nueva inspección'}</Text>

          <Text style={styles.label}>Placa</Text>
          <TextInput
            style={styles.input}
            value={placa}
            onChangeText={(text) => setPlaca(normalizePlate(text))}
            placeholder="Número de placa"
            autoCapitalize="characters"
          />

          <Pressable style={styles.secondaryButton} onPress={capturarPlaca}>
            <Ionicons name="camera-outline" size={20} color="#B91C1C" />
            <Text style={styles.secondaryButtonText}>Tomar foto para reconocer placa</Text>
          </Pressable>

          <TextInput
            style={styles.input}
            value={kilometraje}
            onChangeText={setKilometraje}
            keyboardType="numeric"
            placeholder="Kilometraje"
          />

          <Text style={styles.label}>Tipo de Servicio</Text>
          <Pressable
            style={styles.selectButton}
            onPress={() => setIsServiceSelectOpen((current) => !current)}>
            <Text style={styles.selectButtonText}>{tipoServicio}</Text>
            <Ionicons
              name={isServiceSelectOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color="#B91C1C"
            />
          </Pressable>
          {isServiceSelectOpen ? (
            <View style={styles.selectOptions}>
              {INSPECTION_SERVICE_TYPES.map((serviceType) => (
                <Pressable
                  key={serviceType}
                  style={[
                    styles.selectOption,
                    tipoServicio === serviceType ? styles.selectedOption : null,
                  ]}
                  onPress={() => {
                    setTipoServicio(serviceType);
                    setIsServiceSelectOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.selectOptionText,
                      tipoServicio === serviceType ? styles.selectedOptionText : null,
                    ]}>
                    {serviceType}
                  </Text>
                  {tipoServicio === serviceType ? (
                    <Ionicons name="checkmark-circle" size={18} color="#B91C1C" />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          <TextInput
            style={[styles.input, styles.multiline]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Observaciones"
            multiline
          />

          <Pressable style={styles.secondaryButton} onPress={agregarImagen}>
            <Ionicons name="camera-reverse-outline" size={20} color="#B91C1C" />
            <Text style={styles.secondaryButtonText}>Cargar imagen con cámara ({imagenes.length}/10)</Text>
          </Pressable>

          <View style={styles.grid}>
            {imagenes.map((image) => (
              <Image key={`${image.uri}-${image.name}`} source={{ uri: image.uri }} style={styles.preview} />
            ))}
          </View>

          <Pressable
            style={[styles.primaryButton, isSaving ? styles.disabledButton : null]}
            onPress={guardar}
            disabled={isSaving}>
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Guardando...' : editingInspection ? 'Actualizar' : 'Guardar'}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={cancelar}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={isCreationAlertVisible}
        onRequestClose={crearOtro}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ingreso móvil creado</Text>
            <Text style={styles.modalMessage}>{creationAlertMessage}</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalSecondaryButton]} onPress={irAlListado}>
                <Text style={styles.modalSecondaryButtonText}>No</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalPrimaryButton]} onPress={crearOtro}>
                <Text style={styles.modalPrimaryButtonText}>Sí</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1 },
  container: { flexGrow: 1, paddingBottom: 32 },
  topBar: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  topBarTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { color: '#FFF', fontWeight: '600' },
  formContent: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#B91C1C', marginBottom: 16 },
  label: { fontWeight: '600', color: '#3F3F46', marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  selectButton: {
    minHeight: 50,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: { color: '#3F3F46', fontWeight: '600' },
  selectOptions: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: -4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectOption: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  selectedOption: { backgroundColor: '#FFF1F2' },
  selectOptionText: { color: '#3F3F46', fontWeight: '500' },
  selectedOptionText: { color: '#B91C1C', fontWeight: '700' },
  secondaryButton: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  secondaryButtonText: { color: '#B91C1C', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  preview: { width: 94, height: 94, borderRadius: 10 },
  primaryButton: {
    backgroundColor: '#E11D2E',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelButtonText: { color: '#B91C1C', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 22,
  },
  modalTitle: { color: '#B91C1C', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  modalMessage: { color: '#3F3F46', fontSize: 16, lineHeight: 22, marginBottom: 22 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalButton: {
    minWidth: 96,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalSecondaryButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FCA5A5' },
  modalPrimaryButton: { backgroundColor: '#E11D2E' },
  modalSecondaryButtonText: { color: '#B91C1C', fontSize: 16, fontWeight: '700' },
  modalPrimaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
