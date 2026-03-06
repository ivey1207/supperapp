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

  useEffect(() => {
    if (!selectedBranch || !userLocation) {
      setRoutePoints([]);
    }
  }, [selectedBranch, userLocation]);

  return (
    <View style={styles.container}>
      <NativeMap
        branches={branches}
        selectedBranchId={selectedBranch?.id}
        onBranchSelect={setSelectedBranch}
        routePoints={routePoints}
        isNavigating={isNavigating}
        onStartNavigation={(branch) => {
          setSelectedBranch(branch);
          setIsNavigating(true);
        }}
        onStopNavigation={() => {
          setIsNavigating(false);
          setSelectedBranch(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
