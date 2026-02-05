
const FILENAME = 'rentrix_master_backup.json';

export const syncToDrive = async (dbData: any, accessToken: string) => {
    // Check for existing file in appDataFolder to overwrite it
    const searchResponse = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchResponse.ok) {
        // If token expired or revoked, this might fail.
        if (searchResponse.status === 401 || searchResponse.status === 403) {
            throw new Error('Google authorization failed. Please sign in again. Status: ' + searchResponse.status);
        }
        throw new Error('Failed to search for backup file in Google Drive. Status: ' + searchResponse.status);
    }

    const searchResult = await searchResponse.json();
    const existingFile = searchResult.files.find((f: any) => f.name === FILENAME);
    const fileId = existingFile ? existingFile.id : null;

    const blob = new Blob([JSON.stringify(dbData)], { type: 'application/json' });
    const metadata = {
        name: FILENAME,
        mimeType: 'application/json',
    };
    
    // If creating a new file, specify the parent folder
    if (!fileId) {
        (metadata as any).parents = ['appDataFolder'];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    // Use PATCH to update an existing file, or POST to create a new one
    const uploadUrl = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(uploadUrl, {
        method: method,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Google Drive Sync Error:", errorBody);
        throw new Error(`Failed to sync backup to Google Drive. Status: ${response.status}`);
    }

    return await response.json();
};