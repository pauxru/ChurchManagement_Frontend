// constants.ts
export const CHURCH_NAME = "A.I.P.C.A";

export const FULL_CHURCH_NAME = "Africa Independent Pentecostal Church of Africa";

// Backend API base URL. Set via NEXT_PUBLIC_API_BASE in .env.local
// (see .env.local.example). Falls back to localhost:5132 (the backend's
// http profile in launchSettings.json) so dev still works without env setup.
export const BASE_ENDPOINT =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";

export const HOME_URL = "https://www.pawadtech.com";
