import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import YandexNavi, { YandexNavigationView } from '../lib/yandex-navi';

interface NativeMapProps {
  onNavigationReady?: () => void;
  onArrival?: (isFinalDestination: boolean) => void;
}

export interface NativeMapHandle {
  startNavigation: (lat: number, lon: number, title?: string) => Promise<void>;
  stopNavigation: () => Promise<void>;
}

export const NativeMap = forwardRef<NativeMapHandle, NativeMapProps>(({ onNavigationReady, onArrival }, ref) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        YandexNavi.initialize();
        
        YandexNavi.onArrival((event) => {
          onArrival?.(event.isFinalDestination);
        });

        setIsInitialized(true);
        onNavigationReady?.();
      } catch (err) {
        setError(`Failed to initialize navigation: ${err}`);
        console.error('Failed to initialize navigation', err);
      }
    };

    init();
  }, [onNavigationReady, onArrival]);

  const startNavigation = async (lat: number, lon: number, title?: string) => {
    if (!isInitialized) {
        Alert.alert('Error', 'Navigation not initialized yet');
        return;
    }

    try {
      await YandexNavi.startNavigation(lat, lon);
    } catch (err) {
      console.error('Navigation Error', err);
      Alert.alert('Navigation Error', 'Failed to start guidance');
    }
  };

  const stopNavigation = async () => {
    try {
      YandexNavi.stopNavigation();
    } catch (err) {
      console.error('Failed to stop navigation', err);
    }
  };

  useImperativeHandle(ref, () => ({
    startNavigation,
    stopNavigation,
  }));

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Initializing Yandex NaviKit...</Text>
      </View>
    );
  }

  return (
    <YandexNavigationView
      style={StyleSheet.absoluteFill}
      onArrival={(event: any) => onArrival?.(event.nativeEvent.isFinalDestination)}
    />
  );
});

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 14,
  },
});
