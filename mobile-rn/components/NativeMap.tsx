import React from 'react';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import type { Branch } from '@/lib/api';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

interface NativeMapProps {
    branches: Branch[];
    selectedBranchId?: string | null;
    onBranchSelect?: (branch: Branch) => void;
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

export default function NativeMap({ branches, selectedBranchId, onBranchSelect }: NativeMapProps) {
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
                .map((branch) => {
                    const isSelected = selectedBranchId === branch.id;
                    return (
                        <Marker
                            key={branch.id}
                            coordinate={{
                                latitude: branch.location!.coordinates[1],
                                longitude: branch.location!.coordinates[0],
                            }}
                            onPress={() => onBranchSelect?.(branch)}
                        >
                            <View style={[
                                styles.markerContainer,
                                { borderColor: getMarkerColor(branch.partnerType) },
                                isSelected && styles.selectedMarker
                            ]}>
                                <MaterialCommunityIcons
                                    name={getMarkerIcon(branch.partnerType) as any}
                                    size={isSelected ? 28 : 22}
                                    color={getMarkerColor(branch.partnerType)}
                                />
                            </View>
                        </Marker>
                    );
                })}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: { width: '100%', height: '100%' },
    markerContainer: {
        backgroundColor: 'white',
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    selectedMarker: {
        transform: [{ scale: 1.2 }],
        borderWidth: 3,
        padding: 8,
    }
});
