import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, Platform } from 'react-native';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 95 : 90, // Increased height
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 35 : 30, // Much more padding for OS buttons
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Explorer',
          tabBarLabel: 'Explorer',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "map" : "map-outline"} size={22} color={color} />
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan',
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 58,
              height: 58,
              backgroundColor: colors.primary,
              borderRadius: 29,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -50, // Lifted even higher to clear text & OS buttons
              borderWidth: 4,
              borderColor: colors.card,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 10,
            }}>
              <Ionicons name="qr-code-outline" size={30} color="#fff" />
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Activity',
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
        }}
      />
    </Tabs>
  );
}
