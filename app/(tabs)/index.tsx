import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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

export default function LoginScreen() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    if (user.trim() === TEMP_USER && password === TEMP_PASSWORD) {
      await AsyncStorage.setItem('temp_session', 'active');
      setError('');
      setIsLoggedIn(true);
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
          <View style={styles.logoMark}>
            <Text style={styles.logoLetters}>VA</Text>
          </View>
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
            <Pressable style={styles.primaryButton} onPress={() => router.push('/explore')}>
              <Text style={styles.primaryButtonText}>Inspeccionar</Text>
            </Pressable>
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
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#D80D18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetters: { color: '#FFF', fontWeight: '800', fontSize: 34 },
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
});
