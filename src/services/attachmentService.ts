import { supabase } from './supabase';

export interface AttachmentContext {
  entityType: string;
  entityId: string;
}

const ATTACHMENTS_BUCKET = 'rentrix-attachments';
const TEN_MB = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const sanitizeFileName = (name: string): string =>
  name
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

const resolveOrgFolder = async (): Promise<string> => {
  if (!supabase) throw new Error('تعذر الاتصال بخدمة التخزين.');

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('تعذر التحقق من هوية المستخدم.');
  const orgId =
    (data.user.app_metadata?.org_id as string | undefined) ||
    (data.user.user_metadata?.org_id as string | undefined) ||
    data.user.id;
  return orgId;
};

const assertValidUpload = (file: File) => {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('نوع الملف غير مدعوم. المسموح: PDF, JPG, PNG, WEBP.');
  }
  if (file.size > TEN_MB) {
    throw new Error('حجم الملف يتجاوز 10 ميجابايت.');
  }
};

export const uploadAttachment = async (
  file: File,
  context: AttachmentContext,
): Promise<{ path: string; url: string }> => {
  if (!supabase) throw new Error('تعذر الاتصال بخدمة التخزين.');

  assertValidUpload(file);
  const orgFolder = await resolveOrgFolder();
  const fileName = sanitizeFileName(file.name || `file-${Date.now()}`);
  const path = `${orgFolder}/${context.entityType}/${context.entityId}/${Date.now()}-${fileName}`;

  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw new Error(`فشل رفع المرفق: ${error.message}`);
  }

  const url = await getAttachmentUrl(path);
  return { path, url };
};

export const deleteAttachment = async (path: string): Promise<void> => {
  if (!path) return;
  if (!supabase) throw new Error('تعذر الاتصال بخدمة التخزين.');

  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
  if (error) throw new Error(`فشل حذف الملف من التخزين: ${error.message}`);
};

export const getAttachmentUrl = async (path: string): Promise<string> => {
  if (!path) throw new Error('مسار المرفق غير صالح.');
  if (path.startsWith('data:')) return path;
  if (!supabase) throw new Error('تعذر الاتصال بخدمة التخزين.');

  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new Error(`تعذر إنشاء رابط آمن للملف: ${error?.message || 'unknown'}`);
  }
  return data.signedUrl;
};
