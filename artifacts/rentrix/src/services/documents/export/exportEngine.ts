import { downloadCsv, type CsvRow } from '@/utils/helpers';
import type { DocumentActionResult } from '../documentTypes';

export const exportEngine = {
  exportCsv(fileName: string, rows: CsvRow[], headers: string[]): DocumentActionResult {
    downloadCsv(fileName, rows, headers);
    return { success: true };
  },
};
