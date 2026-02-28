import React from 'react';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import type { Branch } from '@/lib/api';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

interface NativeMapProps {
    branches: Branch[];
}

const INITIAL_REGION = {
    latitude: 41.2995,
    longitude: 69.2401,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

const getMarkerIcon = (type: string) => {
    switch (type) {
        case 'CAR_WASH':
            return 'car-wash';
        case 'GAS_STATION':
            return 'gas-station';
        case 'SERVICE':
            return 'wrench';
        default:
            return 'map-marker';
    }
};

const getMarkerColor = (type: string) => {
    switch (type) {
        case 'CAR_WASH':
            return '#3b82f6'; // blue-500
        case 'GAS_STATION':
            return '#ef4444'; // red-500
        case 'SERVICE':
            return '#eab308'; // yellow-500
        default:
            return '#64748b'; // slate-500
    }
};

export default function NativeMap({ branches }: NativeMapProps) {
    return (
        <MapView
            style={styles.map}
            initialRegion={INITIAL_REGION}
            provider={PROVIDER_DEFAULT}
            showsUserLocation
            showsMyLocationButton
        >
            {branches
                .filter((b) => b.location?.coordinates?.length === 2)
                .map((branch) => (
                    <Marker
                        key={branch.id}
                        coordinate={{
                            latitude: branch.location!.coordinates[1],
                            longitude: branch.location!.coordinates[0],
                        }}
                        title={branch.name}
                        description={branch.address}
                    >
                        <View style={{ backgroundColor: 'white', padding: 4, borderRadius: 20, borderWidth: 2, borderColor: getMarkerColor(branch.partnerType) }}>
                            <MaterialCommunityIcons
                                name={getMarkerIcon(branch.partnerType) as any}
                                size={24}
                                color={getMarkerColor(branch.partnerType)}
                            />
                        </View>
                    </Marker>
                ))}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: { width: '100%', height: '100%' },
});
