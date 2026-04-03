import { Database } from '../types';
import { supabaseData } from './supabaseDataService';

interface BackupPayload {
  version: '1.0';
  createdAt: string;
  data: Database;
}

export const exportToJson = (data: unknown, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};

export const importFromJson = (file: File): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = event => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const json = JSON.parse(result);
          resolve(json);
        } else {
          reject(new Error("File content is not a string."));
        }
      } catch (error) {
        reject(new Error("Error parsing JSON file."));
      }
    };
    fileReader.onerror = error => reject(error);
    fileReader.readAsText(file);
  });
};

export const createBackupFile = async (): Promise<void> => {
  const data = await supabaseData.getAllData();
  const payload: BackupPayload = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    data,
  };

  const date = payload.createdAt.split('T')[0];
  const filename = `rentrix-backup-${date}.json`;
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};

export const validateBackupFile = (json: unknown): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['ملف النسخة الاحتياطية غير صالح (صيغة غير صحيحة).'] };
  }

  const payload = json as Partial<BackupPayload>;

  if (!payload.version) {
    errors.push('الحقل version مفقود.');
  }

  if (!payload.createdAt || Number.isNaN(Date.parse(payload.createdAt))) {
    errors.push('الحقل createdAt مفقود أو بتنسيق تاريخ غير صحيح.');
  }

  if (!payload.data || typeof payload.data !== 'object') {
    errors.push('الحقل data مفقود.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const downloadSystemSnapshot = (db: unknown) => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `Rentrix_Backup_${date}.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};
