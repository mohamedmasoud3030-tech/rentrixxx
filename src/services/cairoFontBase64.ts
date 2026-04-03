// Kept as base64 intentionally for PDF generation only.
// jsPDF needs the embedded Cairo glyph data at runtime to render Arabic text
// consistently across offline and serverless environments.
export const cairoFontBase64 = 'AAEAAAARAQAABAAQR0RFRgABAAgUAAAEsEdQT1MAAQAIjAAAFsRPUy8yAAABbAAAAFhjbWFwAAACAAAAA7xnYXNwAAAEgAAAAAhnbHlmAAAEhAAAAL5oaGVhAAABMAAAADZoaGVhAAABTAAAACRobXR4AAABXAAAACRsb2NhAAABZAAAACRtYXhwAAABdAAAACBuYW1lAAACgAAAAjZwb3N0AAADuAAAACwAAQAAAAEAAIrfXt1fDzz1AAsD6AAAAADa6k3hAAAAANrqTeEAAQAAAAAAUP/gAAUAAgAFAAEAIOkB//3//wAAAAAAIOkAAPw=='; // Truncated for brevity
