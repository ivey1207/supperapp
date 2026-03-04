import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useColorScheme, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getBranchById, getServices, getFileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openYandexNavigation } from '@/lib/navigation';

const { width } = Dimensions.get('window');

export default function BranchDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];

    const { data: branch, isLoading: isBranchLoading } = useQuery({
        queryKey: ['branch', id],
        queryFn: () => getBranchById(token!, id!),
        enabled: !!token && !!id,
    });

    const { data: services = [], isLoading: isServicesLoading } = useQuery({
        queryKey: ['services', id],
        queryFn: () => getServices(token!, id),
        enabled: !!token && !!id,
    });

    if (isBranchLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!branch) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>Филиал не найден</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={{ color: colors.primary }}>Назад</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Image Header */}
                <View style={styles.imageHeader}>
                    <Image
                        source={{ uri: getFileUrl(branch.photoUrl || (branch.images && branch.images[0])) || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&q=80' }}
                        style={styles.headerImage}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.imageGradient}
                    />

                    {/* Floating Back Button */}
                    <SafeAreaView style={styles.backButtonWrapper}>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* Quick Info Overlay */}
                    <View style={styles.headerInfo}>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>
                                {branch.partnerType === 'SERVICE' ? 'Автосервис' : 'Автомойка'}
                            </Text>
                        </View>
                        <Text style={styles.branchName}>{branch.name}</Text>
                        <View style={styles.ratingRow}>
                            <FontAwesome name="star" size={16} color="#fbbf24" />
                            <Text style={styles.ratingText}>4.8</Text>
                            <Text style={styles.reviewsText}>(120+ отзывов)</Text>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Info Section */}
                    <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
                        <View style={styles.infoRow}>
                            <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="location" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.infoTextWrapper}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Адрес</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{branch.address || 'Адрес не указан'}</Text>
                            </View>
                            {branch.location?.coordinates?.[1] && (
                                <TouchableOpacity
                                    style={[styles.miniRoundBtn, { backgroundColor: colors.primary + '20' }]}
                                    onPress={() => router.push({
                                        pathname: '/(tabs)/map',
                                        params: { branchId: branch.id, startNav: 'true' }
                                    } as any)}
                                >
                                    <MaterialIcons name="navigation" size={24} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.infoRow}>
                            <View style={[styles.infoIcon, { backgroundColor: '#10b98115' }]}>
                                <Ionicons name="time" size={20} color="#10b981" />
                            </View>
                            <View style={styles.infoTextWrapper}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Режим работы</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>Круглосуточно</Text>
                            </View>
                        </View>

                        {/* Description Section */}
                        {branch.description && (
                            <View style={styles.descriptionWrapper}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>О филиале</Text>
                                <Text style={[styles.descriptionText, { color: colors.text }]}>{branch.description}</Text>
                            </View>
                        )}
                    </View>

                    {/* Services Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Наши услуги</Text>
                        {isServicesLoading ? (
                            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                        ) : services.length > 0 ? (
                            services.map((service) => (
                                <TouchableOpacity
                                    key={service.id}
                                    style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.serviceInfo}>
                                        <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                                        <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                            {service.description || 'Качественная услуга для вашего авто'}
                                        </Text>
                                        <View style={styles.priceRow}>
                                            <View style={[styles.priceTag, { backgroundColor: colors.primary + '10' }]}>
                                                <Text style={[styles.price, { color: colors.primary }]}>
                                                    {service.pricePerMinute?.toLocaleString()} UZS / мин
                                                </Text>
                                            </View>
                                            {!!service.durationMinutes && (
                                                <View style={styles.durationTag}>
                                                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                                    <Text style={[styles.duration, { color: colors.textSecondary }]}>
                                                        {service.durationMinutes} мин
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Услуги временно недоступны</Text>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.navBtn, { borderColor: colors.border }]}
                    onPress={() => {
                        router.push({
                            pathname: '/(tabs)/map',
                            params: { branchId: branch.id, startNav: 'true' }
                        } as any);
                    }}
                >
                    <MaterialIcons name="navigation" size={24} color={colors.primary} />
                    <Text style={[styles.navBtnText, { color: colors.primary }]}>Пoказать маpшpут</Text>
                </TouchableOpacity>
                {branch.partnerType === 'SERVICE' && (
                    <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.callBtnText}>Вызвать мастера</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    scrollContent: { paddingBottom: 120 },
    imageHeader: { height: 350, width: '100%' },
    headerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imageGradient: { ...StyleSheet.absoluteFillObject },
    backButtonWrapper: { position: 'absolute', top: 0, left: 16 },
    iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { position: 'absolute', bottom: 24, left: 20, right: 20 },
    typeBadge: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12
    },
    typeText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    branchName: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ratingText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    reviewsText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    content: { marginTop: -20, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: 'transparent', paddingHorizontal: 20 },
    infoSection: {
        marginTop: 20,
        borderRadius: 24,
        padding: 20,
        gap: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    backButton: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    infoIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    infoTextWrapper: { flex: 1 },
    infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 16, fontWeight: '700' },
    miniRoundBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    descriptionWrapper: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 4,
    },
    section: { marginTop: 32 },
    sectionTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    serviceInfo: { flex: 1 },
    serviceName: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    serviceDesc: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    priceTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    price: { fontSize: 16, fontWeight: '800' },
    durationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    duration: { fontSize: 13, fontWeight: '600' },
    addBtn: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15 },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        gap: 12,
        borderTopWidth: 1,
        zIndex: 100
    },
    navBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 8
    },
    navBtnText: { fontWeight: '700', fontSize: 14 },
    callBtn: { flex: 2, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    callBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
