import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/store/auth-store';

export default function IndexScreen() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#285c3b" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/dashboard' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
