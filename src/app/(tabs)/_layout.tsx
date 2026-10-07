import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';

import { HomeIcon, PolicyIcon, UserIcon } from '@/components/ui/icons';
import { AppColors } from '@/constants/theme';

export default function AgentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppColors.accent,
        tabBarInactiveTintColor: '#8fa38c',
        tabBarStyle: {
          height: Platform.select({ ios: 88, default: 68 }),
          paddingTop: 10,
          paddingBottom: Platform.select({ ios: 28, default: 10 }),
          backgroundColor: AppColors.brand,
          borderTopColor: '#244c3c',
          borderTopWidth: 1,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: AppColors.bg },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <HomeIcon size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="policies"
        options={{
          title: 'Policies',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <PolicyIcon size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <UserIcon size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="policy/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(197, 232, 108, 0.12)',
  },
});

