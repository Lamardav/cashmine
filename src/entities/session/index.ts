import { create } from 'zustand';
import { setAuthToken } from '@/shared/api';
import { KEYS, load, save } from '@/shared/lib/storage';

interface SessionState {
  token: string | null;
  setToken(token: string | null): void;
}

const initial = load<string | null>(KEYS.token, null);
setAuthToken(initial);

/** The API token lives only in this browser's localStorage, never in code or the build. */
export const useSessionStore = create<SessionState>((set) => ({
  token: initial,
  setToken(token) {
    save(KEYS.token, token);
    setAuthToken(token);
    set({ token });
  },
}));
