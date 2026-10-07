import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { Platform } from 'react-native';

import type { LoginResponse } from '@/types';

type AuthState = {
  token: string | null;
  userId: string | null;
  mobile: string | null;
  role: LoginResponse['role'] | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
};

const sessionKey = 'jbsolar_session';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  mobile: null,
  role: null,
  isAuthenticated: false,
  isHydrated: false,
  hydrate: async () => {
    if (Platform.OS === 'web') {
      set({ isHydrated: true });
      return;
    }

    try {
      const serialized = await SecureStore.getItemAsync(sessionKey);
      if (!serialized) return;

      let session: LoginResponse;
      try {
        session = JSON.parse(serialized) as LoginResponse;
      } catch (error) {
        console.error('Saved agent session is unreadable.', error);
        await SecureStore.deleteItemAsync(sessionKey);
        return;
      }

      if (
        !session.accessToken ||
        session.role !== 'VENDOR_AGENT' ||
        !session.userId ||
        !session.mobile
      ) {
        await SecureStore.deleteItemAsync(sessionKey);
        return;
      }

      set({
        token: session.accessToken,
        userId: session.userId,
        mobile: session.mobile,
        role: session.role,
        isAuthenticated: true,
      });
    } finally {
      set({ isHydrated: true });
    }
  },
  setSession: async (session) => {
    if (session.role !== 'VENDOR_AGENT') {
      throw new Error('This app is only available to vendor agents.');
    }

    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
    }
    set({
      token: session.accessToken,
      userId: session.userId,
      mobile: session.mobile,
      role: session.role,
      isAuthenticated: true,
      isHydrated: true,
    });
  },
  logout: async () => {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(sessionKey);
    }
    set({
      token: null,
      userId: null,
      mobile: null,
      role: null,
      isAuthenticated: false,
      isHydrated: true,
    });
  },
}));
