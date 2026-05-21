import { Ionicons } from '@expo/vector-icons';
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

export default function NewInspectionScreen() {
  const [placa, setPlaca] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);

  const agregarImagen = async () => {
    if (imagenes.length >= 10) {
      Alert.alert('Límite alcanzado', 'Solo se permiten 10 imágenes por inspección.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir acceso a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImagenes((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const guardar = () => {
    Alert.alert('Inspección', 'Se guardó correctamente.');
    setPlaca('');
    setKilometraje('');
    setObservaciones('');
    setImagenes([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Nueva inspección</Text>

        <TextInput style={styles.input} value={placa} onChangeText={setPlaca} placeholder="Número de placa" />
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
          <Ionicons name="images-outline" size={20} color="#B91C1C" />
          <Text style={styles.secondaryButtonText}>Cargar imagen ({imagenes.length}/10)</Text>
        </Pressable>

        <View style={styles.grid}>
          {imagenes.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.preview} />
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={guardar}>
          <Text style={styles.primaryButtonText}>Guardar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#B91C1C', marginBottom: 16 },
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
});
