<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run the web app

This project now runs as a pure web application (Vite + React), without Electron.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Add your Gemini API key in app settings (Integrations), or wire it through your own environment flow.
3. Run the app:
   `npm run dev`
4. Build for production:
   `npm run build`
5. Preview production build:
   `npm run preview`

## Deploy on Vercel

1. Import the repository in Vercel.
2. Keep preset as `Vite`.
3. Make sure these settings are used:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click `Deploy`.

This project includes [`vercel.json`](./vercel.json) with SPA routing fallback so routes like `/settings/general` work after refresh.

## Post-Deploy Checklist

1. Open the production URL and test login.
2. Navigate directly to a deep link (for example: `/settings/general`) and confirm no `404`.
3. Verify Supabase calls succeed in browser console/network.
4. If env vars were edited, trigger a redeploy from Vercel.
