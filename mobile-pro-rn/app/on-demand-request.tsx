import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { createOnDemandOrder, getBranches } from '@/lib/api';
import * as Location from 'expo-location';

export default function OnDemandRequestScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const { token } = useAuth();
    const router = useRouter();
    const colors = Colors.light;

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [address, setAddress] = useState('Determining location...');
    const [carDetails, setCarDetails] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to use mobile services.');
                return;
            }
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            // Reverse geocoding
            try {
                let reverse = await Location.reverseGeocodeAsync(loc.coords);
                if (reverse.length > 0) {
                    const r = reverse[0];
                    setAddress(`${r.street || ''} ${r.name || ''}, ${r.city || ''}`);
                }
            } catch (e) {
                setAddress(`Lat: ${loc.coords.latitude.toFixed(4)}, Lon: ${loc.coords.longitude.toFixed(4)}`);
            }
        })();
    }, []);

    const handleSubmit = async () => {
        if (!location) {
            Alert.alert('Error', 'Wait for location to be determined.');
            return;
        }
        if (!carDetails) {
            Alert.alert('Error', 'Please enter car details.');
            return;
        }

        setLoading(true);
        try {
            await createOnDemandOrder(token!, {
                type: type || 'MOBILE_WASH',
                userAddress: address,
                userLat: location.coords.latitude,
                userLon: location.coords.longitude,
                carDetails,
                description,
            });
            Alert.alert('Success', 'Request sent! A specialist will contact you shortly.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/orders') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to create request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {type === 'MOBILE_WASH' ? 'Mobile Wash' : 'Вызов мастера'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.label}>YOUR LOCATION</Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={20} color={colors.primary} />
                        <Text style={styles.addressText}>{address}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>CAR DETAILS (Model, Number, Color)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Black Chevrolet Tahoe, 01 A 001 AA"
                        value={carDetails}
                        onChangeText={setCarDetails}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>ADDITIONAL DETAILS (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe your problem or specific wash needs..."
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                        We will find the nearest available specialist for you. Service cost will be confirmed by phone.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.submitBtnText}>SEND REQUEST</Text>
                            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    label: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 12 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
    input: { fontSize: 16, fontWeight: '500', color: '#1E293B', paddingVertical: 8 },
    textArea: { height: 100, textAlignVertical: 'top' },
    infoBox: { flexDirection: 'row', gap: 10, paddingHorizontal: 10, marginBottom: 30 },
    infoText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 20 },
    submitBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
