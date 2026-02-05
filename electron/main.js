const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const { platform } = require('os');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const isDev = !!VITE_DEV_SERVER_URL;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // Production build
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Hardened Content Security Policy for production
  const csp = `
    default-src 'self';
    script-src 'self' ${isDev ? "'unsafe-eval'" : ''} https://accounts.google.com/gsi/client;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' *.google.com;
    img-src 'self' data: blob:;
    frame-src https://accounts.google.com/gsi/;
  `.replace(/\s{2,}/g, ' ').trim();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (platform() !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('show-save-dialog', async (event, defaultPath) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'حفظ نسخة احتياطية',
        defaultPath: defaultPath,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    return filePath;
});

ipcMain.handle('write-file', (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('show-open-dialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: 'استعادة من نسخة احتياطية',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    return filePaths.length > 0 ? filePaths[0] : null;
});

ipcMain.handle('read-file', (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('query-gemini', async (event, { query, context }) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("The API_KEY environment variable is not set in the main process.");
        }
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `أنت مساعد ذكاء اصطناعي متخصص في تحليل بيانات نظام إدارة العقارات. مهمتك هي الإجابة على أسئلة المستخدم باللغة العربية بناءً على البيانات التي يتم تزويدك بها في صيغة JSON فقط.
قواعد صارمة:
1.  لا تستخدم أي معلومات خارج سياق البيانات المقدمة.
2.  إذا كان السؤال لا يمكن الإجابة عليه من البيانات، أجب بـ "المعلومات المطلوبة غير متوفرة في البيانات الحالية".
3.  قدم إجابات مختصرة ومباشرة.
4.  عند ذكر مبالغ مالية، اذكرها كما هي بدون إضافة رموز عملات.
5.  البيانات التي سأزودك بها الآن هي مصدر معلوماتك الوحيد.
البيانات:
${context}
`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: query,
            config: { systemInstruction }
        });

        if (!response.text) {
            return { success: false, error: "Received an empty response from the AI assistant." };
        }
        return { success: true, text: response.text };
    } catch (error) {
        console.error("Gemini IPC Error:", error);
        return { success: false, error: error.message };
    }
});