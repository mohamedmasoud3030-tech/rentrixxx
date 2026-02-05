import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    saveBackup: async (defaultPath: string, content: string) => {
        const filePath = await ipcRenderer.invoke('show-save-dialog', defaultPath);
        if (filePath) {
            return await ipcRenderer.invoke('write-file', filePath, content);
        }
        return { success: false, error: 'Save cancelled by user.' };
    },
    loadBackup: async () => {
        const filePath = await ipcRenderer.invoke('show-open-dialog');
        if (filePath) {
            return await ipcRenderer.invoke('read-file', filePath);
        }
        return { success: false, error: 'Open cancelled by user.' };
    },
    queryGemini: async (query: string, context: string) => {
        return await ipcRenderer.invoke('query-gemini', { query, context });
    }
});