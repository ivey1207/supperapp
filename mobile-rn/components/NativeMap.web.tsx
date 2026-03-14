import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Branch } from '@/lib/api';

interface NativeMapProps {
    branches: Branch[];
}

export default function NativeMap({ branches }: NativeMapProps) {
    // Build Google Maps URL with branch markers
    const baseUrl = 'https://maps.google.com/maps?q=41.2995,69.2401&z=12&output=embed';

    return (
        <View style={styles.container}>
            <iframe
                src={baseUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen={true}
                style={{ border: 0 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },
});
