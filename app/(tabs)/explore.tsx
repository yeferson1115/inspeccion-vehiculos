import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface InspectionItem {
  id: string;
  placa: string;
  kilometraje: string;
  observaciones: string;
  imagenes: string[];
  createdAt: string;
}

const STORAGE_KEY = 'inspections';
const SESSION_KEY = 'temp_session';

const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

const extractPlateFromUri = (uri: string) => {
  const match = uri.toUpperCase().match(/[A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{2}[A-Z]/);
  return match?.[0] ?? '';
};

export default function NewInspectionScreen() {
  const [placa, setPlaca] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);

  const capturarPlaca = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
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

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImagenes((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const guardar = async () => {
    if (!placa.trim()) {
      Alert.alert('Campo requerido', 'Debes ingresar o capturar una placa.');
      return;
    }

    const newItem: InspectionItem = {
      id: Date.now().toString(),
      placa: normalizePlate(placa),
      kilometraje,
      observaciones,
      imagenes,
      createdAt: new Date().toISOString(),
    };

    const current = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: InspectionItem[] = current ? JSON.parse(current) : [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([newItem, ...parsed]));

    Alert.alert('Inspección', 'Se guardó correctamente.');
    router.replace('/');
  };

  const cancelar = () => {
    router.replace('/');
  };

  const cerrarSesion = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>inspeccor</Text>
          <Pressable style={styles.logoutButton} onPress={cerrarSesion}>
            <Ionicons name="log-out-outline" size={22} color="#FFF" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <View style={styles.formContent}>
          <Text style={styles.title}>Nueva inspección</Text>

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
          {imagenes.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.preview} />
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={guardar}>
          <Text style={styles.primaryButtonText}>Guardar</Text>
        </Pressable>

          <Pressable style={styles.cancelButton} onPress={cancelar}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { paddingBottom: 32 },
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
});
