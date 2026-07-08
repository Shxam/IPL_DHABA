import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile } from '@/types';

interface UserState {
  user: Profile | null;
  sessionToken: string | null;
  setUser: (user: Profile | null) => void;
  setSessionToken: (token: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      setUser: (user) => set({ user }),
      setSessionToken: (sessionToken) => set({ sessionToken }),
      logout: () => set({ user: null, sessionToken: null }),
    }),
    {
      name: 'ipl-dhaba-user',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
