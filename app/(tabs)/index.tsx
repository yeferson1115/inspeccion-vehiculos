import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { getLoginErrorMessage, getSession, login, logout } from '@/services/auth';
import { AvaluoMovil, getAvaluosMovil } from '@/services/avaluos';
import { getPendingInspectionsCount, syncPendingInspections } from '@/services/inspections';

export default function LoginScreen() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [avaluos, setAvaluos] = useState<AvaluoMovil[]>([]);
  const [avaluosTotal, setAvaluosTotal] = useState(0);
  const [isLoadingAvaluos, setIsLoadingAvaluos] = useState(false);
  const [avaluosError, setAvaluosError] = useState('');
  const [search, setSearch] = useState('');
  const [pendingInspections, setPendingInspections] = useState(0);
  const [isSyncingInspections, setIsSyncingInspections] = useState(false);


  const loadPendingInspections = useCallback(async () => {
    const pendingCount = await getPendingInspectionsCount();
    setPendingInspections(pendingCount);
  }, []);

  const loadAvaluosMovil = useCallback(async (searchValue = '') => {
    setIsLoadingAvaluos(true);
    setAvaluosError('');

    try {
      const response = await getAvaluosMovil({ search: searchValue, perPage: 10 });
      setAvaluos(response.data);
      setAvaluosTotal(response.total ?? response.data.length);
    } catch {
      setAvaluosError('No fue posible cargar los avalúos trabajados desde el API.');
    } finally {
      setIsLoadingAvaluos(false);
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session) {
        setIsLoggedIn(true);
        await loadAvaluosMovil('');
        await loadPendingInspections();
      }
    };

    void loadSession();
  }, [loadAvaluosMovil, loadPendingInspections]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        void loadAvaluosMovil('');
        void loadPendingInspections();
      }
    }, [isLoggedIn, loadAvaluosMovil, loadPendingInspections]),
  );

  const handleLogin = async () => {
    if (!user.trim() || !password) {
      setError('Ingresa usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(user, password);
      setIsLoggedIn(true);
      await loadAvaluosMovil('');
      await loadPendingInspections();
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadAvaluosMovil(search);
  };


  const handleSyncPendingInspections = async () => {
    setIsSyncingInspections(true);

    try {
      const result = await syncPendingInspections();
      setPendingInspections(result.pending.length);

      Alert.alert(
        'Sincronización de inspecciones',
        result.pending.length === 0
          ? `Se enviaron ${result.sent.length} inspecciones pendientes al servicio de Laravel.`
          : `Se enviaron ${result.sent.length}. Quedan ${result.pending.length} pendientes para intentar nuevamente cuando tengas conexión.`,
      );

      if (result.sent.length > 0) {
        await loadAvaluosMovil(search);
      }
    } finally {
      setIsSyncingInspections(false);
    }
  };


  const formatVehicle = (item: AvaluoMovil) => {
    const ingreso = item.ingreso;
    const details = [ingreso?.marca, ingreso?.linea, ingreso?.modelo].filter(Boolean).join(' ');

    return details || ingreso?.movil || 'Vehículo sin descripción';
  };

  const formatDate = (date?: string | null) => {
    if (!date) {
      return 'Sin fecha';
    }

    return new Date(date).toLocaleDateString('es-CO');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {isLoggedIn ? (
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}></Text>
            <Pressable
              style={styles.logoutButton}
              onPress={async () => {
                await logout();
                setIsLoggedIn(false);
                setAvaluos([]);
                setAvaluosTotal(0);
                setPendingInspections(0);
              }}>
              <Ionicons name="log-out-outline" size={22} color="#FFF" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : null}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>            
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
                <Text style={styles.helperText}>Ingresa con el usuario registrado en el API de El Evaluador.</Text>
                <Pressable
                  style={[styles.primaryButton, isLoading ? styles.disabledButton : null]}
                  onPress={handleLogin}
                  disabled={isLoading}>
                  <Text style={styles.primaryButtonText}>{isLoading ? 'Ingresando...' : 'Ingresar'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.primaryButton} onPress={() => router.push('/explore')}>
                  <Text style={styles.primaryButtonText}>Inspeccionar</Text>
                </Pressable>


                <View style={styles.offlineCard}>
                  <View style={styles.offlineHeader}>
                    <Ionicons name="cloud-upload-outline" size={22} color="#B91C1C" />
                    <Text style={styles.offlineTitle}>Inspecciones pendientes: {pendingInspections}</Text>
                  </View>
                  <Text style={styles.offlineText}>
                    Las inspecciones se guardan en este dispositivo y se enviarán al servicio de Laravel cuando tengas internet.
                  </Text>
                  <Pressable
                    style={[styles.syncButton, pendingInspections === 0 || isSyncingInspections ? styles.disabledButton : null]}
                    onPress={handleSyncPendingInspections}
                    disabled={pendingInspections === 0 || isSyncingInspections}>
                    <Text style={styles.syncButtonText}>{isSyncingInspections ? 'Enviando...' : 'Enviar pendientes'}</Text>
                  </Pressable>
                </View>

                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>Avalúos trabajados ({avaluosTotal})</Text>
                  <Pressable style={styles.refreshButton} onPress={() => loadAvaluosMovil(search)} disabled={isLoadingAvaluos}>
                    <Ionicons name="refresh" size={18} color="#B91C1C" />
                    <Text style={styles.refreshText}>Actualizar</Text>
                  </Pressable>
                </View>

                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.input, styles.searchInput]}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar placa, solicitante o documento"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isLoadingAvaluos}>
                    <Ionicons name="search" size={20} color="#FFF" />
                  </Pressable>
                </View>

                {avaluosError ? <Text style={styles.errorText}>{avaluosError}</Text> : null}
                {isLoadingAvaluos ? <Text style={styles.emptyText}>Cargando avalúos...</Text> : null}
                {!isLoadingAvaluos && avaluos.length === 0 ? (
                  <Text style={styles.emptyText}>No hay avalúos trabajados para mostrar.</Text>
                ) : (
                  avaluos.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listPlate}>{item.ingreso?.placa || 'Sin placa'}</Text>
                        <Text style={styles.listDate}>{formatDate(item.updated_at)}</Text>
                      </View>
                      <Text style={styles.listMeta}>{formatVehicle(item)}</Text>
                      <Text style={styles.listMeta}>Solicitante: {item.ingreso?.solicitante || 'N/A'}</Text>
                      <Text style={styles.listMeta}>Servicio: {item.ingreso?.tiposervicio || item.tipo || 'N/A'}</Text>
                      {item.consecutivo ? <Text style={styles.listMeta}>Consecutivo: {item.consecutivo}</Text> : null}
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1 },
  topBar: {
    width: '100%',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topBarTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutText: { color: '#FFF', fontWeight: '600' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
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
  disabledButton: { opacity: 0.7 },

  offlineCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  offlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  offlineTitle: { color: '#9A3412', fontWeight: '700' },
  offlineText: { color: '#7C2D12', fontSize: 12, marginBottom: 10 },
  syncButton: {
    backgroundColor: '#B91C1C',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  syncButtonText: { color: '#FFF', fontWeight: '700' },
  listHeader: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  listTitle: { flex: 1, fontWeight: '700', color: '#3F3F46' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { color: '#B91C1C', fontWeight: '600', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, marginBottom: 0 },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E11D2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#71717A' },
  listItem: {
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  listPlate: { fontWeight: '700', color: '#B91C1C' },
  listDate: { color: '#71717A', fontSize: 12 },
  listMeta: { color: '#52525B', marginTop: 2 },
});
