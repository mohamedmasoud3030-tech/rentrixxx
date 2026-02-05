// @ts-nocheck
import { toast } from 'react-hot-toast';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;

export const initGoogleClient = (callback, clientId) => {
    if (!clientId) {
        console.warn("Google Client ID is not configured. Sync feature will be disabled.");
        return;
    }
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: callback,
        });
    } catch(e) {
        console.error("Error initializing Google Client", e);
    }
};

export const signIn = () => {
    if (!tokenClient) {
        console.error("Google Auth client not initialized.");
        toast.error("فشل تهيئة خدمة جوجل. تأكد من اتصالك بالإنترنت ومن إدخال Client ID صحيح في الإعدادات.");
        return;
    }
    // Prompt the user to select a Google Account and ask for consent to share their data
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const signOut = (accessToken: string) => {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Google token revoked.');
        });
    }
};

export const fetchUserProfile = async (accessToken: string) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching Google user profile:', error);
        return null;
    }
};