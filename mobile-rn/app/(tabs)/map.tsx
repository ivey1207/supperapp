import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getBranches, type Branch } from '@/lib/api';
import Colors from '@/constants/Colors';
import NativeMap from '@/components/NativeMap';
import BranchCard from '@/components/BranchCard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchRoute, RoutePoint } from '@/lib/navigation';

export default function MapScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [locationError, setLocationError] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const partnerTypeParam = typeof params.partnerType === 'string' ? params.partnerType : undefined;

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', token, partnerTypeParam, userLocation?.coords.latitude, userLocation?.coords.longitude],
    queryFn: () => getBranches(
      token!,
      'all',
      'all',
      partnerTypeParam,
      userLocation?.coords.latitude,
      userLocation?.coords.longitude
    ),
    enabled: !!token,
  });

  useEffect(() => {
    if (params.branchId && branches.length > 0) {
      const branch = branches.find(b => b.id === params.branchId);
      if (branch) {
        setSelectedBranch(branch);
        if (params.startNav === 'true') {
          setIsNavigating(true);
        }
      }
    }
  }, [params.branchId, params.startNav, branches]);

  // Request location on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  // Fetch route when branch is selected
  useEffect(() => {
    if (selectedBranch && userLocation && selectedBranch.location?.coordinates?.[1]) {
      const startLat = userLocation.coords.latitude;
      const startLon = userLocation.coords.longitude;
      const endLat = selectedBranch.location.coordinates[1];
      const endLon = selectedBranch.location.coordinates[0];

      fetchRoute(startLat, startLon, endLat, endLon).then(setRoutePoints);
    } else {
      setRoutePoints([]);
      setIsNavigating(false);
    }
  }, [selectedBranch, userLocation]);

  return (
    <View style={styles.container}>
      <NativeMap
        branches={branches}
        selectedBranchId={selectedBranch?.id}
        onBranchSelect={setSelectedBranch}
        routePoints={routePoints}
        onStartNavigation={(branch) => {
          setSelectedBranch(branch);
          setIsNavigating(true);
        }}
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
            onPress={() => router.push(`/branch/${selectedBranch.id}` as any)}
            style={{ borderColor: colors.border, borderWidth: 1 }}
            onNavigate={() => setIsNavigating(true)}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedBranch(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation HUD */}
      {isNavigating && (
        <View style={styles.navHud}>
          <View style={styles.navInfo}>
            <Ionicons name="navigate" size={24} color="#fff" />
            <Text style={styles.navText}>Навигация активна</Text>
          </View>
          <TouchableOpacity
            style={styles.stopNavBtn}
            onPress={() => setIsNavigating(false)}
          >
            <Text style={styles.stopNavText}>ОСТАНОВИТЬ</Text>
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
    borderColor: '#3b82f6',
    zIndex: 10,
  },
  title: { fontSize: 16, fontWeight: '800' },
  navHud: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 100,
  },
  navInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  stopNavBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stopNavText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
});
