import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const TEMP_USER = 'inspector';
const TEMP_PASSWORD = '123456';
const STORAGE_KEY = 'inspections';
const SESSION_KEY = 'temp_session';

interface InspectionItem {
  id: string;
  placa: string;
  kilometraje: string;
  observaciones: string;
  imagenes: string[];
  createdAt: string;
}

const isToday = (isoDate: string) => {
  const today = new Date();
  const date = new Date(isoDate);
  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  );
};

export default function LoginScreen() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [todayInspections, setTodayInspections] = useState<InspectionItem[]>([]);

  const loadTodayInspections = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const all: InspectionItem[] = raw ? JSON.parse(raw) : [];
    setTodayInspections(all.filter((item) => isToday(item.createdAt)));
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const session = await AsyncStorage.getItem(SESSION_KEY);
      if (session === 'active') {
        setIsLoggedIn(true);
        await loadTodayInspections();
      }
    };

    void loadSession();
  }, [loadTodayInspections]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        void loadTodayInspections();
      }
    }, [isLoggedIn, loadTodayInspections]),
  );

  const handleLogin = async () => {
    if (user.trim() === TEMP_USER && password === TEMP_PASSWORD) {
      await AsyncStorage.setItem('temp_session', 'active');
      setError('');
      setIsLoggedIn(true);
      await loadTodayInspections();
      return;
    }

    setError('Usuario o contraseña inválidos.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.brandText}>EL EVALUADOR</Text>
          <Text style={styles.title}>Inspección Vehicular</Text>

          {!isLoggedIn ? (
            <>
              <TextInput
                style={styles.input}
                value={user}
                onChangeText={setUser}
                placeholder="Usuario"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Text style={styles.helperText}>Temporal: inspector / 123456</Text>
              <Pressable style={styles.primaryButton} onPress={handleLogin}>
                <Text style={styles.primaryButtonText}>Ingresar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/explore')}>
                <Text style={styles.primaryButtonText}>Inspeccionar</Text>
              </Pressable>
              <Text style={styles.listTitle}>Inspecciones de hoy ({todayInspections.length})</Text>
              {todayInspections.length === 0 ? (
                <Text style={styles.emptyText}>No hay inspecciones registradas hoy.</Text>
              ) : (
                todayInspections.map((item) => (
                  <View key={item.id} style={styles.listItem}>
                    <Text style={styles.listPlate}>{item.placa}</Text>
                    <Text style={styles.listMeta}>Km: {item.kilometraje || 'N/A'} · Fotos: {item.imagenes.length}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#991B1B',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  logoMark: {
    alignSelf: 'center',
  },
  logoImage: { alignSelf: 'center', width: 200, height: 80, marginBottom: 12 },
  brandText: {
    alignSelf: 'center',
    letterSpacing: 3,
    color: '#3F3F46',
    marginBottom: 10,
    fontSize: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  helperText: { textAlign: 'center', color: '#52525B', marginBottom: 12, fontSize: 12 },
  errorText: { color: '#DC2626', marginBottom: 8 },
  primaryButton: {
    backgroundColor: '#E11D2E',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  listTitle: { marginTop: 16, fontWeight: '700', color: '#3F3F46', marginBottom: 8 },
  emptyText: { color: '#71717A' },
  listItem: {
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  listPlate: { fontWeight: '700', color: '#B91C1C' },
  listMeta: { color: '#52525B', marginTop: 2 },
});
