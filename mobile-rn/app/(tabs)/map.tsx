import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getBranches, type Branch } from '@/lib/api';
import Colors from '@/constants/Colors';
import NativeMap from '@/components/NativeMap';
import BranchCard from '@/components/BranchCard';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', token],
    queryFn: () => getBranches(token!, 'OPEN'),
    enabled: !!token,
  });

  useEffect(() => {
    if (params.branchId && branches.length > 0) {
      const branch = branches.find(b => b.id === params.branchId);
      if (branch) setSelectedBranch(branch);
    }
  }, [params.branchId, branches]);

  return (
    <View style={styles.container}>
      <NativeMap
        branches={branches}
        selectedBranchId={selectedBranch?.id}
        onBranchSelect={setSelectedBranch}
      />

      {/* Floating Header Overlay */}
      <View style={[styles.headerOverlay, { backgroundColor: colors.card + 'E0' }]}>
        <Text style={[styles.title, { color: colors.text }]}>Филиалы ({branches.length})</Text>
      </View>

      {/* Selected Branch Card */}
      {selectedBranch && (
        <View style={styles.cardOverlay}>
          <BranchCard
            branch={selectedBranch}
            index={0}
            onPress={() => { }}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedBranch(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  closeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0f172a',
    zIndex: 10,
  },
  title: { fontSize: 16, fontWeight: '800' },
});
