const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const sanitizeHtmlInput = (value: string): string => {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
};

export const sanitizeMultilineText = (value: string): string => {
  return sanitizeHtmlInput(value).replace(/\r?\n/g, '<br />');
};

export const sanitizeUiTextPayload = (payload: unknown): string => {
  if (typeof payload !== 'string') return '';
  return sanitizeHtmlInput(payload.trim());
};
