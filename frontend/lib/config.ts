// Shared backend base URL. Previously api.ts and auth.ts each defined
// their own copy, which drifted in v5 (one used the wrong env name).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
