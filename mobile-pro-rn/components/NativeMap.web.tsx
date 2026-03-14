import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { NativeMapHandle } from './NativeMap';

interface NativeMapProps {
  onNavigationReady?: () => void;
  onArrival?: (isFinalDestination: boolean) => void;
}

const NativeMap = forwardRef<NativeMapHandle, NativeMapProps>(({ onNavigationReady }, ref) => {
  useImperativeHandle(ref, () => ({
    startNavigation: async () => {
      console.warn('Navigation not supported on web');
    },
    stopNavigation: async () => {
      console.warn('Navigation not supported on web');
    },
  }));

  React.useEffect(() => {
    onNavigationReady?.();
  }, [onNavigationReady]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Navigation Map (Mobile Only)</Text>
      <Text style={styles.subtext}>Please use the mobile app for turn-by-turn navigation.</Text>
    </View>
  );
});

export default NativeMap;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0F172A', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
