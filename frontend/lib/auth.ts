export type AuthProvider = "email" | "google" | "github";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  workspace: string;
  provider: AuthProvider;
  avatar_url?: string;
  email_verified: boolean;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
};

const SESSION_KEY = "ragora_session";
const LEGACY_USER_KEY = "rag_user_id";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function readError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return typeof parsed.detail === "string" ? parsed.detail : text;
  } catch {
    return text || `Request failed with ${response.status}`;
  }
}

async function authRequest<T>(path: string, body: unknown, authenticated = false): Promise<T> {
  const token = authenticated ? getAccessToken() : "";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<T>;
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(LEGACY_USER_KEY, session.user.workspace);
}

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.access_token || !session.user?.workspace) return null;
    return session;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getSession()?.access_token ?? "";
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export async function loginWithEmail(email: string, password: string) {
  const session = await authRequest<AuthSession>("/auth/login", { email, password });
  saveSession(session);
  return session;
}

export async function signupWithEmail(name: string, email: string, password: string) {
  const session = await authRequest<AuthSession>("/auth/signup", { name, email, password });
  saveSession(session);
  return session;
}

export async function loginWithGoogle(idToken: string) {
  const session = await authRequest<AuthSession>("/auth/google", { id_token: idToken });
  saveSession(session);
  return session;
}

export async function forgotPassword(email: string) {
  return authRequest<{ ok: boolean; message: string }>("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string) {
  return authRequest<{ ok: boolean; message: string }>("/auth/reset-password", { token, password });
}

export async function verifyEmail(code: string) {
  return authRequest<{ ok: boolean; message: string }>("/auth/verify-email", { code }, true);
}
