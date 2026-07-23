// Base URL of the DALI OS API. Defaults to production; override for local
// development by setting VITE_DALI_BASE_URL (e.g. http://localhost:3001) in a
// .env file before `npm run build`. Any origin used here must also be listed in
// manifest.json `host_permissions` so the side panel can fetch it cross-origin.
export const DALI_BASE_URL =
    (import.meta.env?.VITE_DALI_BASE_URL as string | undefined) ||
    'https://os.dali.dartmouth.edu';
