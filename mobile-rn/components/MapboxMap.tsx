import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapboxMapProps {
  userLocation?: { latitude: number; longitude: number };
  providerLocation?: { latitude: number; longitude: number; heading?: number };
  routePoints?: { latitude: number; longitude: number }[];
  style?: any;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ userLocation, providerLocation, routePoints, style }) => {
  const initialRegion = {
    latitude: userLocation?.latitude || providerLocation?.latitude || 41.2995,
    longitude: userLocation?.longitude || providerLocation?.longitude || 69.2401,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="User"
            pinColor="green"
          />
        )}
        {providerLocation && (
          <Marker
            coordinate={providerLocation}
            title="Provider"
            pinColor="blue"
            rotation={providerLocation.heading}
          />
        )}
        {routePoints && routePoints.length > 0 && (
          <Polyline
            coordinates={routePoints}
            strokeColor="#3B82F6"
            strokeWidth={5}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapboxMap;
