import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const colors = Colors.dark;

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: 'rgba(51,65,85,0.8)', borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarLabel: 'Главная', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Карта', tabBarLabel: 'Карта', tabBarIcon: ({ color }) => <TabIcon name="map-marker" color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Заказы', tabBarLabel: 'Заказы', tabBarIcon: ({ color }) => <TabIcon name="list" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль', tabBarLabel: 'Профиль', tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
