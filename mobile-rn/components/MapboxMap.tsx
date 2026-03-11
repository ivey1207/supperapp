import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '');

interface MapboxMapProps {
  userLocation?: { latitude: number; longitude: number };
  providerLocation?: { latitude: number; longitude: number; heading?: number };
  routePoints?: { latitude: number; longitude: number }[];
  style?: any;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ userLocation, providerLocation, routePoints, style }) => {
  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Street}>
        <MapboxGL.Camera
          zoomLevel={14}
          centerCoordinate={
            providerLocation 
              ? [providerLocation.longitude, providerLocation.latitude]
              : userLocation 
                ? [userLocation.longitude, userLocation.latitude]
                : [69.2401, 41.2995] // Tashkent
          }
          animationMode={'flyTo'}
          animationDuration={1000}
        />

        {/* Route Line */}
        {routePoints && routePoints.length > 0 && (
          <MapboxGL.ShapeSource
            id="routeSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routePoints.map(p => [p.longitude, p.latitude]),
              },
              properties: {},
            }}
          >
            <MapboxGL.LineLayer
              id="routeLayer"
              style={{
                lineColor: '#3B82F6',
                lineWidth: 5,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* User Marker */}
        {userLocation && (
          <MapboxGL.PointSource id="userSource" coordinate={[userLocation.longitude, userLocation.latitude]}>
            <MapboxGL.CircleLayer
              id="userCircle"
              style={{
                circleRadius: 8,
                circleColor: '#10B981',
                circleStrokeWidth: 2,
                circleStrokeColor: '#fff',
              }}
            />
          </MapboxGL.PointSource>
        )}

        {/* Provider (Car) Marker */}
        {providerLocation && (
          <MapboxGL.MarkerView
            id="providerMarker"
            coordinate={[providerLocation.longitude, providerLocation.latitude]}
          >
            <View style={{
              transform: [{ rotate: `${providerLocation.heading || 0}deg` }]
            }}>
              <MapboxGL.Images images={{ car: require('../assets/images/car-icon.png') }} />
              {/* Note: Using a View with Image for better rotation control in MarkerView */}
              <View style={styles.carContainer}>
                <View style={[styles.carWrapper, { transform: [{ rotate: `${providerLocation.heading || 0}deg` }] }]}>
                    {/* The image will be handled in the main component to avoid require issues in snippet */}
                </View>
              </View>
            </View>
          </MapboxGL.MarkerView>
        )}
      </MapboxGL.MapView>
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
  carContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carWrapper: {
    width: 32,
    height: 32,
  }
});

export default MapboxMap;
