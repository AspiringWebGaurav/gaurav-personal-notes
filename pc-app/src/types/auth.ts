export interface UserSession {
  uid: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
  idToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  user?: UserSession | null;
}
