import type { PostgrestError } from '@supabase/supabase-js';

export type DiagnosticCode =
  | 'missing_supabase_url'
  | 'missing_supabase_anon_key'
  | 'supabase_connection_failure'
  | 'missing_required_table'
  | 'missing_required_rpc'
  | 'ambiguous_relationship'
  | 'missing_required_column'
  | 'blank_runtime_error';

export type RuntimeDiagnostic = {
  code: DiagnosticCode;
  messageAr: string;
  technical: string;
};

type SupabaseErrorLike = Partial<PostgrestError> & {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function readSupabaseContext(error: SupabaseErrorLike): string | null {
  const haystack = `${error.message ?? ''} ${error.details ?? ''}`;
  const relationMatch = /relation\s+"?([a-zA-Z0-9.]+)"?\s+does not exist/i.exec(haystack);
  if (relationMatch?.[1]) return `table=${relationMatch[1]}`;

  const functionMatch = /function\s+([a-zA-Z0-9.]+)\s*\(/i.exec(haystack);
  if (functionMatch?.[1]) return `rpc=${functionMatch[1]}`;

  const schemaFunctionMatch = /function\s+"?([a-zA-Z0-9.]+)"?\s+does not exist/i.exec(haystack);
  if (schemaFunctionMatch?.[1]) return `rpc=${schemaFunctionMatch[1]}`;

  return null;
}

function formatSupabaseMetadata(error: SupabaseErrorLike): string {
  const metadata = [
    `code=${error.code ?? 'unknown'}`,
    `message=${error.message ?? 'Unknown error'}`,
    `details=${error.details ?? 'none'}`,
    `hint=${error.hint ?? 'none'}`,
  ];
  const context = readSupabaseContext(error);
  if (context) metadata.push(context);
  return metadata.join(' | ');
}

export function getEnvDiagnostics(): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL) {
    diagnostics.push({
      code: 'missing_supabase_url',
      messageAr: 'متغير الاتصال بقاعدة البيانات (VITE_SUPABASE_URL) غير مضبوط.',
      technical: 'Missing VITE_SUPABASE_URL in current Vite runtime environment.',
    });
  }

  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    diagnostics.push({
      code: 'missing_supabase_anon_key',
      messageAr: 'مفتاح الوصول العام (VITE_SUPABASE_ANON_KEY) غير مضبوط.',
      technical: 'Missing VITE_SUPABASE_ANON_KEY in current Vite runtime environment.',
    });
  }

  return diagnostics;
}

export function parseSupabaseDiagnostics(error: unknown): RuntimeDiagnostic[] {
  if (!error) return [];
  const diagnostics: RuntimeDiagnostic[] = [];
  const maybe = error as SupabaseErrorLike;
  const text = `${maybe.message ?? ''} ${maybe.details ?? ''}`.toLowerCase();
  const metadata = formatSupabaseMetadata(maybe);

  if (text.includes('failed to fetch') || text.includes('network') || maybe.code === 'ECONNREFUSED') {
    diagnostics.push({
      code: 'supabase_connection_failure',
      messageAr: 'فشل الاتصال بخدمة Supabase. تحقق من الشبكة وصحة رابط المشروع.',
      technical: `Supabase connectivity error: ${metadata}`,
    });
  }

  if (text.includes('does not exist') && text.includes('relation')) {
    diagnostics.push({
      code: 'missing_required_table',
      messageAr: 'يوجد جدول مطلوب غير موجود في قاعدة البيانات الحالية.',
      technical: `Missing relation/table detected: ${metadata}`,
    });
  }

  if (text.includes('function') && text.includes('does not exist')) {
    diagnostics.push({
      code: 'missing_required_rpc',
      messageAr: 'يوجد إجراء RPC مطلوب غير موجود في قاعدة البيانات الحالية.',
      technical: `Missing RPC function detected: ${metadata}`,
    });
  }
  if (text.includes('more than one relationship was found') || maybe.code === 'PGRST201') {
    diagnostics.push({
      code: 'ambiguous_relationship',
      messageAr: 'العلاقة بين الجداول غير واضحة. يلزم تحديد العلاقة صراحة في الاستعلام.',
      technical: `Ambiguous relationship (PGRST) detected: ${metadata}`,
    });
  }
  if (text.includes('column') && text.includes('does not exist')) {
    diagnostics.push({
      code: 'missing_required_column',
      messageAr: 'يوجد عمود مطلوب غير موجود في قاعدة البيانات الحالية.',
      technical: `Missing column detected: ${metadata}`,
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      code: 'blank_runtime_error',
      messageAr: 'حدث خطأ غير متوقع أثناء تحميل البيانات. راجع التفاصيل التقنية أدناه.',
      technical: `Unhandled Supabase/runtime error: ${metadata}`,
    });
  }

  if (typeof console !== 'undefined') {
    console.error('[supabase-runtime-diagnostic]', {
      code: maybe.code ?? 'unknown',
      message: maybe.message ?? 'Unknown error',
      details: maybe.details ?? null,
      hint: maybe.hint ?? null,
      context: readSupabaseContext(maybe),
    });
  }

  return diagnostics;
}
