import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getBranches } from '@/lib/api';
import Colors from '@/constants/Colors';

import NativeMap from '@/components/NativeMap';

export default function MapScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { token } = useAuth();
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', token],
    queryFn: () => getBranches(token!, 'OPEN'),
    enabled: !!token,
  });

  return (
    <View style={styles.container}>
      <NativeMap branches={branches} />

      <View style={[styles.overlay, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Филиалы ({branches.length})</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
});
