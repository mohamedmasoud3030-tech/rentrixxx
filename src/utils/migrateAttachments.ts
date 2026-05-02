import { supabase } from '@/services/api/supabaseClient';
import { logger } from '@/services/logger';
import { uploadAttachment } from '../services/attachmentService';

const BATCH_SIZE = 10;

const dataUrlToFile = (dataUrl: string, fileName: string): File => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error('صيغة base64 غير صالحة');
  const mimeType = match[1] || 'application/octet-stream';
  const base64Data = match[2];
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.codePointAt(i) || 0;
  }
  return new File([bytes], fileName, { type: mimeType });
};

const processLegacyAttachments = async () => {
  const { data, error } = await supabase
    .from('attachments')
    .select('id, entity_type, entity_id, name, mime, size, data_url, storage_path')
    .not('data_url', 'is', null)
    .is('storage_path', null)
    .limit(BATCH_SIZE);

  if (error) throw error;
  if (!data?.length) return 0;

  let successCount = 0;
  for (const row of data) {
    try {
      if (!row.data_url || !String(row.data_url).startsWith('data:')) continue;
      const safeName = row.name || `attachment-${row.id}.bin`;
      const file = dataUrlToFile(row.data_url, safeName);
      const { path } = await uploadAttachment(file, {
        entityType: row.entity_type || 'LEGACY',
        entityId: row.entity_id || row.id,
      });

      const { error: updateError } = await supabase
        .from('attachments')
        .update({
          file_name: safeName,
          file_size: file.size,
          mime_type: file.type || row.mime || 'application/octet-stream',
          storage_path: path,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          data_url: null,
        })
        .eq('id', row.id)
        .is('storage_path', null);

      if (updateError) {
        logger.error('[AttachmentMigration] Failed updating attachment row', { message: updateError.message, code: updateError.code, context: { rowId: row.id } });
      } else {
        successCount += 1;
      }
    } catch (migrateError) {
      logger.error('[AttachmentMigration] Failed migrating attachment row', { message: migrateError instanceof Error ? migrateError.message : 'unknown_error', context: { rowId: row.id } });
    }
  }

  return successCount;
};

const processLegacyUtilityBills = async () => {
  const { data, error } = await supabase
    .from('utility_bills')
    .select('id, bill_image_url, bill_image_mime')
    .not('bill_image_url', 'is', null)
    .like('bill_image_url', 'data:%')
    .limit(BATCH_SIZE);

  if (error) throw error;
  if (!data?.length) return 0;

  let successCount = 0;
  for (const row of data) {
    try {
      const existing = await supabase
        .from('attachments')
        .select('id')
        .eq('entity_type', 'UTILITY')
        .eq('entity_id', row.id)
        .limit(1)
        .maybeSingle();

      if (existing.data?.id) {
        continue;
      }

      const mimeExt = row.bill_image_mime === 'application/pdf' ? 'pdf' : 'jpg';
      const file = dataUrlToFile(row.bill_image_url, `utility-bill-${row.id}.${mimeExt}`);
      const { path } = await uploadAttachment(file, { entityType: 'UTILITY', entityId: row.id });

      const { error: insertError } = await supabase.from('attachments').insert({
        entity_type: 'UTILITY',
        entity_id: row.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || row.bill_image_mime || 'application/octet-stream',
        storage_path: path,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      });
      if (insertError) throw insertError;

      const { error: clearError } = await supabase
        .from('utility_bills')
        .update({ bill_image_url: null, bill_image_mime: null })
        .eq('id', row.id)
        .like('bill_image_url', 'data:%');

      if (clearError) {
        logger.error('[AttachmentMigration] Utility bill uploaded but not cleared', { message: clearError.message, code: clearError.code, context: { rowId: row.id } });
      } else {
        successCount += 1;
      }
    } catch (migrateError) {
      logger.error('[AttachmentMigration] Failed migrating utility bill', { message: migrateError instanceof Error ? migrateError.message : 'unknown_error', context: { rowId: row.id } });
    }
  }

  return successCount;
};

export const migrateAttachments = async () => {
  let migratedTotal = 0;
  let pass = 0;
  while (true) {
    pass += 1;
    if (pass > 100) break;
    const migratedAttachments = await processLegacyAttachments();
    const migratedBills = await processLegacyUtilityBills();
    const batchTotal = migratedAttachments + migratedBills;
    migratedTotal += batchTotal;
    if (batchTotal < 1) break;
  }
  return migratedTotal;
};
