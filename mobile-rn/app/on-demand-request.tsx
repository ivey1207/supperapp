import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { createOnDemandOrder, getBranches } from '@/lib/api';
import * as Location from 'expo-location';

const CAR_TYPES = [
    { id: 'sedan', label: 'Седан', icon: 'car-side', multiplier: 1 },
    { id: 'hatchback', label: 'Хетчбэк', icon: 'car-back', multiplier: 0.9 },
    { id: 'suv', label: 'Кроссовер', icon: 'car-suv', multiplier: 1.3 },
    { id: 'lux', label: 'Люкс', icon: 'car-convertible', multiplier: 2.0 },
];

const TARIFFS = [
    { id: 'start', label: 'Start', price: 35000, desc: 'Базовая мойка' },
    { id: 'medium', label: 'Medium', price: 65000, desc: 'Кузов + Салон' },
    { id: 'max', label: 'Max', price: 120000, desc: 'Полный детейлинг' },
    { id: 'premier', label: 'Premier', price: 250000, desc: 'Премиум уход' },
];

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
    
    const [selectedCarType, setSelectedCarType] = useState(CAR_TYPES[0]);
    const [selectedTariff, setSelectedTariff] = useState(TARIFFS[0]);

    const calculatePrice = () => {
        return Math.round(selectedTariff.price * selectedCarType.multiplier);
    };

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
                carDetails: `${carDetails} (${selectedCarType.label}, ${selectedTariff.label})`,
                description: `Tariff: ${selectedTariff.label}, Car: ${selectedCarType.label}. ${description}`,
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

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.label}>МЕСТОПОЛОЖЕНИЕ</Text>
                    <View style={styles.locationContainer}>
                        <Ionicons name="location" size={20} color={colors.primary} />
                        <Text style={styles.addressText}>{address}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>ТИП АВТОМОБИЛЯ</Text>
                <View style={styles.row}>
                    {CAR_TYPES.map((item) => (
                        <TouchableOpacity 
                            key={item.id} 
                            style={[styles.typeItem, selectedCarType.id === item.id && styles.typeItemActive]}
                            onPress={() => setSelectedCarType(item)}
                        >
                            <MaterialCommunityIcons 
                                name={item.icon as any} 
                                size={28} 
                                color={selectedCarType.id === item.id ? colors.primary : '#64748B'} 
                            />
                            <Text style={[styles.typeLabel, selectedCarType.id === item.id && styles.typeLabelActive]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>ВЫБОР ТАРИФА</Text>
                {TARIFFS.map((t) => (
                    <TouchableOpacity 
                        key={t.id} 
                        style={[styles.tariffItem, selectedTariff.id === t.id && styles.tariffItemActive]}
                        onPress={() => setSelectedTariff(t)}
                    >
                        <View style={styles.tariffInfo}>
                            <Text style={[styles.tariffLabel, selectedTariff.id === t.id && styles.tariffLabelActive]}>{t.label}</Text>
                            <Text style={styles.tariffDesc}>{t.desc}</Text>
                        </View>
                        <Text style={[styles.tariffPrice, selectedTariff.id === t.id && styles.tariffPriceActive]}>
                            {Math.round(t.price * selectedCarType.multiplier).toLocaleString()} сум
                        </Text>
                    </TouchableOpacity>
                ))}

                <View style={styles.card}>
                    <Text style={styles.label}>ДАННЫЕ АВТО (Модель, Номер, Цвет)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Черная Malibu, 01 A 777 AA"
                        value={carDetails}
                        onChangeText={setCarDetails}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>КОММЕНТАРИЙ (Необязательно)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Опишите детали..."
                        multiline
                        numberOfLines={4}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.totalPriceBox}>
                    <Text style={styles.totalPriceLabel}>ИТОГО К ОПЛАТЕ</Text>
                    <Text style={styles.totalPriceValue}>{calculatePrice().toLocaleString()} сум</Text>
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
                            <Text style={styles.submitBtnText}>ОФОРМИТЬ МОЙКУ</Text>
                            <Ionicons name="chevron-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
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
    scrollContent: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 10, letterSpacing: 0.5 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 15, letterSpacing: 1 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
    input: { fontSize: 16, fontWeight: '500', color: '#1E293B', paddingVertical: 8 },
    textArea: { height: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    typeItem: { flex: 1, alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginHorizontal: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    typeItemActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6' },
    typeLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 8 },
    typeLabelActive: { color: '#3B82F6' },
    tariffItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    tariffItemActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6' },
    tariffInfo: { flex: 1 },
    tariffLabel: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
    tariffLabelActive: { color: '#3B82F6' },
    tariffDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
    tariffPrice: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    tariffPriceActive: { color: '#3B82F6' },
    totalPriceBox: { alignItems: 'center', marginVertical: 20 },
    totalPriceLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 5 },
    totalPriceValue: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
    submitBtn: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
