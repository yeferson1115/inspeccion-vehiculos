import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios, { isAxiosError } from 'axios';

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  permissions: { name: string }[];
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL;
    const fromExtra =
      (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? undefined;
    return fromEnv ?? fromExtra ?? '';
  }, []);

  const isFormValid = email.trim().length > 3 && password.length >= 6;

  const handleLogin = async () => {
    if (!isFormValid || isLoading) {
      return;
    }

    if (!apiUrl) {
      setErrorMessage('Configura EXPO_PUBLIC_API_URL para conectar tu API.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await axios.post<LoginResponse>(`${apiUrl}/login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      await AsyncStorage.multiSet([
        ['token', response.data.access_token],
        ['token_type', response.data.token_type],
        ['expires_in', String(response.data.expires_in)],
        ['user', JSON.stringify(response.data.user)],
        ['permissions', JSON.stringify(response.data.permissions ?? [])],
      ]);

      setSuccessMessage(`Bienvenido, ${response.data.user.name}.`);
      setPassword('');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setErrorMessage('Correo o contraseña inválidos.');
      } else {
        setErrorMessage('No se pudo iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={34} color="#2563EB" />
          </View>

          <Text style={styles.title}>Inspección Vehicular</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta para continuar</Text>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="nombre@empresa.com"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Pressable
            onPress={handleLogin}
            disabled={!isFormValid || isLoading}
            style={[styles.loginButton, (!isFormValid || isLoading) && styles.loginButtonDisabled]}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </Pressable>

          <Text style={styles.footNote}>Diseñado para Android y iOS con una experiencia rápida y segura.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
    color: '#475569',
  },
  inputBlock: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 8,
  },
  successText: {
    color: '#16A34A',
    fontSize: 13,
    marginBottom: 8,
  },
  footNote: {
    marginTop: 18,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
  },
});
