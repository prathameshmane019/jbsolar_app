import { config } from '@gluestack-ui/config';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('Could not keep the splash screen visible.', error);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate()
      .catch((error: unknown) => {
        console.error('Could not restore the saved agent session.', error);
      })
      .finally(() => {
        SplashScreen.hideAsync().catch((error: unknown) => {
          console.error('Could not hide the splash screen.', error);
        });
      });
  }, [hydrate]);

  return (
    <GluestackUIProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}

function AppNavigator() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated && pathname !== '/' && pathname !== '/login') {
      router.replace('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isHydrated, pathname, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f7f3' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workflow" />
    </Stack>
  );
}
