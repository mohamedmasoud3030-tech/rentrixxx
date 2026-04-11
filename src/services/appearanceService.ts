import { supabase } from '@/services/supabase';

export async function uploadCompanyLogo(file: File): Promise<string> {
  const filePath = `company-logo-${Date.now()}.${file.name.split('.').pop()}`;

  const { data, error } = await supabase.storage
    .from('company-assets')
    .upload(filePath, file, { upsert: true });

  if (error || !data) {
    throw new Error(error?.message || 'فشل رفع الشعار');
  }

  const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(data.path);
  return urlData.publicUrl;
}
