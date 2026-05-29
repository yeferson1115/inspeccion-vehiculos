import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { API_URL, getAuthHeaders } from '@/services/auth';

export const INSPECTIONS_STORAGE_KEY = 'inspections';

const INSPECTION_SAVE_PATH = process.env.EXPO_PUBLIC_INSPECTION_SAVE_PATH ?? '/inspecciones/movil';

export type InspectionSyncStatus = 'pending' | 'sent' | 'failed';

export type InspectionServiceType = 'Avaluo' | 'Inspección' | 'Avaluo e Inspección' | 'Sec Bogota';

export const INSPECTION_SERVICE_TYPES: InspectionServiceType[] = [
  'Avaluo',
  'Inspección',
  'Avaluo e Inspección',
  'Sec Bogota',
];

export interface InspectionImage {
  uri: string;
  name: string;
  type: string;
}

export interface InspectionItem {
  id: string;
  placa: string;
  kilometraje: string;
  tipoServicio: InspectionServiceType;
  observaciones: string;
  imagenes: InspectionImage[];
  createdAt: string;
  syncStatus: InspectionSyncStatus;
  syncAttempts: number;
  syncedAt?: string | null;
  lastSyncError?: string | null;
  serverId?: number | string | null;
}

export interface InspectionPayload {
  client_id: string;
  placa: string;
  kilometraje: string;
  observaciones: string;
  tipo_servicio: InspectionServiceType;
  tiposervicio: InspectionServiceType;
  fecha_inspeccion: string;
  origen: 'app_movil';
  imagenes: InspectionImage[];
}

export interface SyncResult {
  sent: InspectionItem[];
  pending: InspectionItem[];
  failed: InspectionItem[];
}

interface LaravelSaveResponse {
  id?: number | string;
  data?: {
    id?: number | string;
  };
}

const getImageName = (uri: string, index: number) => {
  const name = uri.split('/').pop()?.split('?')[0];
  return name || `inspeccion-${index + 1}.jpg`;
};

const getImageType = (uri: string) => {
  const extension = uri.split('.').pop()?.toLowerCase().split('?')[0];

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
};

const normalizeInspectionImage = (image: Partial<InspectionImage> | string, index: number): InspectionImage => {
  if (typeof image === 'string') {
    return {
      uri: image,
      name: getImageName(image, index),
      type: getImageType(image),
    };
  }

  const uri = image.uri ?? '';

  return {
    uri,
    name: image.name ?? getImageName(uri, index),
    type: image.type ?? getImageType(uri),
  };
};

export const createInspectionItem = ({
  placa,
  kilometraje,
  tipoServicio,
  observaciones,
  imagenes,
}: Pick<InspectionItem, 'placa' | 'kilometraje' | 'tipoServicio' | 'observaciones' | 'imagenes'>): InspectionItem => ({
  id: Date.now().toString(),
  placa,
  kilometraje,
  tipoServicio,
  observaciones,
  imagenes,
  createdAt: new Date().toISOString(),
  syncStatus: 'pending',
  syncAttempts: 0,
  syncedAt: null,
  lastSyncError: null,
  serverId: null,
});

const parseStoredInspections = (raw: string | null): InspectionItem[] => {
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as Partial<InspectionItem>[];

  return parsed.map((item) => ({
    id: item.id ?? Date.now().toString(),
    placa: item.placa ?? '',
    kilometraje: item.kilometraje ?? '',
    tipoServicio: item.tipoServicio ?? 'Avaluo',
    observaciones: item.observaciones ?? '',
    imagenes: Array.isArray(item.imagenes)
      ? item.imagenes.map((image, index) => normalizeInspectionImage(image, index))
      : [],
    createdAt: item.createdAt ?? new Date().toISOString(),
    syncStatus: item.syncStatus ?? 'pending',
    syncAttempts: item.syncAttempts ?? 0,
    syncedAt: item.syncedAt ?? null,
    lastSyncError: item.lastSyncError ?? null,
    serverId: item.serverId ?? null,
  }));
};

const saveInspections = (inspections: InspectionItem[]) =>
  AsyncStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(inspections));

export const getStoredInspections = async () => {
  const current = await AsyncStorage.getItem(INSPECTIONS_STORAGE_KEY);
  return parseStoredInspections(current);
};

export const saveInspectionOffline = async (inspection: InspectionItem) => {
  const current = await getStoredInspections();
  await saveInspections([inspection, ...current]);
  return inspection;
};

export const updateInspectionOffline = async (inspection: InspectionItem) => {
  const current = await getStoredInspections();
  const updatedInspection: InspectionItem = {
    ...inspection,
    syncStatus: 'pending',
    syncAttempts: 0,
    syncedAt: null,
    lastSyncError: null,
  };
  const exists = current.some((item) => item.id === inspection.id);
  const updated = exists
    ? current.map((item) => (item.id === inspection.id ? updatedInspection : item))
    : [updatedInspection, ...current];

  await saveInspections(updated);
  return updatedInspection;
};

export const getPendingInspections = async () => {
  const inspections = await getStoredInspections();
  return inspections.filter((inspection) => inspection.syncStatus !== 'sent');
};

export const getPendingInspectionsCount = async () => {
  const pending = await getPendingInspections();
  return pending.length;
};

export const buildLaravelInspectionPayload = (inspection: InspectionItem): InspectionPayload => ({
  client_id: inspection.id,
  placa: inspection.placa,
  kilometraje: inspection.kilometraje,
  observaciones: inspection.observaciones,
  tipo_servicio: inspection.tipoServicio,
  tiposervicio: inspection.tipoServicio,
  fecha_inspeccion: inspection.createdAt,
  origen: 'app_movil',
  imagenes: inspection.imagenes,
});

export const buildLaravelInspectionFormData = (inspection: InspectionItem) => {
  const payload = buildLaravelInspectionPayload(inspection);
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (key !== 'imagenes') {
      formData.append(key, String(value ?? ''));
    }
  });

  inspection.imagenes.forEach((image, index) => {
    const normalizedImage = normalizeInspectionImage(image, index);

    if (normalizedImage.uri) {
      formData.append('imagenes[]', {
        uri: normalizedImage.uri,
        name: normalizedImage.name,
        type: normalizedImage.type,
      } as unknown as Blob);
    }
  });

  return formData;
};

const getSyncErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data && typeof error.response.data === 'object'
      ? (error.response.data as Record<string, unknown>).message
      : null;

    if (typeof message === 'string') {
      return message;
    }

    if (!error.response) {
      return 'Sin conexión o el servicio no respondió.';
    }

    return `Error ${error.response.status} al guardar en Laravel.`;
  }

  return 'No fue posible enviar la inspección.';
};

export const submitInspectionToLaravel = async (inspection: InspectionItem) => {
  const { data } = await axios.post<LaravelSaveResponse>(
    `${API_URL}${INSPECTION_SAVE_PATH}`,
    buildLaravelInspectionFormData(inspection),
    {
      headers: await getAuthHeaders(),
    },
  );

  return data;
};

const markInspectionAsSent = (inspection: InspectionItem, response: LaravelSaveResponse): InspectionItem => ({
  ...inspection,
  syncStatus: 'sent',
  syncedAt: new Date().toISOString(),
  lastSyncError: null,
  serverId: response.id ?? response.data?.id ?? inspection.serverId ?? null,
});

const markInspectionAsFailed = (inspection: InspectionItem, error: unknown): InspectionItem => ({
  ...inspection,
  syncStatus: 'failed',
  syncAttempts: inspection.syncAttempts + 1,
  lastSyncError: getSyncErrorMessage(error),
});

export const syncPendingInspections = async (): Promise<SyncResult> => {
  const inspections = await getStoredInspections();
  const updated: InspectionItem[] = [];
  const sent: InspectionItem[] = [];
  const failed: InspectionItem[] = [];

  for (const inspection of inspections) {
    if (inspection.syncStatus === 'sent') {
      updated.push(inspection);
      continue;
    }

    try {
      const response = await submitInspectionToLaravel(inspection);
      const sentInspection = markInspectionAsSent(inspection, response);
      sent.push(sentInspection);
      updated.push(sentInspection);
    } catch (error) {
      const failedInspection = markInspectionAsFailed(inspection, error);
      failed.push(failedInspection);
      updated.push(failedInspection);
    }
  }

  await saveInspections(updated);

  return {
    sent,
    failed,
    pending: updated.filter((inspection) => inspection.syncStatus !== 'sent'),
  };
};
