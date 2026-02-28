import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';
import Colors from '@/constants/Colors';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { token, logout } = useAuth();
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '35' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.fullName || user?.phone || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.fullName || 'Пользователь'}</Text>
          <Text style={[styles.phone, { color: colors.textSecondary }]}>{user?.phone || '—'}</Text>
        </View>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]} activeOpacity={0.8}>
          <FontAwesome name="credit-card" size={20} color={colors.primary} style={{ marginRight: 14 }} />
          <Text style={[styles.menuText, { color: colors.text }]}>Кошелёк</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]} activeOpacity={0.8}>
          <FontAwesome name="bell-o" size={20} color={colors.primary} style={{ marginRight: 14 }} />
          <Text style={[styles.menuText, { color: colors.text }]}>Уведомления</Text>
          <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.error }]} onPress={() => logout().then(() => router.replace('/login'))} activeOpacity={0.8}>
          <Text style={[styles.logoutText, { color: colors.error }]}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: { alignItems: 'center', paddingVertical: 36, marginHorizontal: 20, marginTop: 8, borderRadius: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', marginTop: 18 },
  phone: { fontSize: 15, marginTop: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 10, padding: 18, borderRadius: 16 },
  menuText: { flex: 1, fontSize: 17, fontWeight: '600' },
  logoutBtn: { marginHorizontal: 20, marginTop: 28, padding: 18, alignItems: 'center', borderRadius: 16, borderWidth: 2 },
  logoutText: { fontSize: 16, fontWeight: '700' },
});
