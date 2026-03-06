import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useColorScheme, Dimensions, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getBranchById, getServices, getFileUrl, getReviews, createReview, likeReview, unlikeReview } from '@/lib/api';
import { Modal, TextInput, Alert } from 'react-native';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function ServiceCard({ service, colors }: any) {
    return (
        <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.card }]}
            activeOpacity={0.7}
        >
            <View style={styles.serviceMain}>
                <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                    <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {service.description || 'High-quality professional service for your vehicle.'}
                    </Text>
                </View>
                <View style={[styles.serviceIcon, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="construct-outline" size={24} color={colors.primary} />
                </View>
            </View>

            <View style={styles.serviceFooter}>
                <View style={styles.priceContainer}>
                    <Text style={[styles.priceValue, { color: colors.primary }]}>
                        {service.pricePerMinute?.toLocaleString()} UZS
                    </Text>
                    <Text style={styles.priceUnit}>/ min</Text>
                </View>
                {!!service.durationMinutes && (
                    <View style={styles.durationBadge}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.durationText}>{service.durationMinutes} min</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function BranchDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();
    const scheme = useColorScheme() ?? 'light';
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

    const { data: reviews = [], refetch: refetchReviews } = useQuery({
        queryKey: ['reviews', id],
        queryFn: () => getReviews(token!, id!),
        enabled: !!token && !!id,
    });

    const [isReviewModalVisible, setIsReviewModalVisible] = React.useState(false);
    const [userRating, setUserRating] = React.useState(5);
    const [userComment, setUserComment] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleToggleLike = async (review: any) => {
        try {
            if (review.isLiked) {
                await unlikeReview(token!, review.id);
            } else {
                await likeReview(token!, review.id);
            }
            refetchReviews();
        } catch (err) {
            console.error('Error toggling like:', err);
        }
    };

    const handleSubmitReview = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await createReview(token!, { branchId: id!, rating: userRating, comment: userComment });
            Alert.alert('Success', 'Your review has been submitted!');
            setIsReviewModalVisible(false);
            setUserRating(5);
            setUserComment('');
            refetchReviews();
        } catch (err) {
            Alert.alert('Error', 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.errorText, { color: colors.text }]}>Branch not found</Text>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Hero Header */}
                <View style={styles.heroSection}>
                    <Image
                        source={{ uri: getFileUrl(branch.photoUrl || (branch.images && branch.images[0])) || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&q=80' }}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(15,23,42,0.95)']}
                        style={styles.heroGradient}
                    />

                    {/* Navigation Actions */}
                    <SafeAreaView style={styles.navHeader}>
                        <TouchableOpacity
                            style={styles.blurBtn}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.navRight}>
                            <TouchableOpacity style={styles.blurBtn}>
                                <Ionicons name="share-outline" size={22} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.blurBtn}>
                                <Ionicons name="heart-outline" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    {/* Header Details */}
                    <View style={styles.heroContent}>
                        <View style={styles.badgeRow}>
                            <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.typeText}>
                                    {branch.partnerType === 'SERVICE' ? 'SERVICE' : 'WASH'}
                                </Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <View style={styles.dot} />
                                <Text style={styles.statusText}>OPEN NOW</Text>
                            </View>
                        </View>
                        <Text style={styles.branchTitle}>{branch.name}</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.ratingBox}>
                                <Ionicons name="star" size={16} color="#FBBF24" />
                                <Text style={styles.ratingVal}>{branch.rating || '0.0'}</Text>
                                <Text style={styles.ratingCount}>({branch.reviewCount || 0})</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.distanceBox}>
                                <Ionicons name="navigate-outline" size={16} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.distanceVal}>1.2 km</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.mainWrapper}>
                    {/* Action Cards */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: colors.card }]}
                            onPress={() => router.push({
                                pathname: '/(tabs)/map',
                                params: { branchId: branch.id, startNav: 'true' }
                            } as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                                <Ionicons name="map-outline" size={22} color="#2563EB" />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.text }]}>Directions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
                                <Ionicons name="call-outline" size={22} color="#16A34A" />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.text }]}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="chatbubble-outline" size={22} color="#D97706" />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.text }]}>Chat</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Location Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
                        <TouchableOpacity
                            style={[styles.locationCard, { backgroundColor: colors.card }]}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="location" size={24} color={colors.primary} />
                            <Text style={[styles.addressText, { color: colors.text }]}>
                                {branch.address || 'Address not available'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Reviews Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
                            <TouchableOpacity onPress={() => setIsReviewModalVisible(true)}>
                                <Text style={{ color: colors.primary, fontWeight: '700' }}>Write Review</Text>
                            </TouchableOpacity>
                        </View>

                        {reviews.length > 0 ? (
                            <View style={styles.reviewsList}>
                                {reviews.map((review: any) => (
                                    <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card }]}>
                                        <View style={styles.reviewHeader}>
                                            <Text style={[styles.reviewUser, { color: colors.text }]}>{review.userName}</Text>
                                            <View style={styles.reviewRating}>
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Ionicons
                                                        key={s}
                                                        name={s <= review.rating ? "star" : "star-outline"}
                                                        size={14}
                                                        color="#FBBF24"
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                        <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
                                        <View style={styles.reviewFooter}>
                                            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                                            <TouchableOpacity
                                                style={styles.likeBtn}
                                                onPress={() => handleToggleLike(review)}
                                            >
                                                <Ionicons
                                                    name={review.isLiked ? "heart" : "heart-outline"}
                                                    size={16}
                                                    color={review.isLiked ? "#F43F5E" : colors.textSecondary}
                                                />
                                                <Text style={[styles.likeCount, { color: review.isLiked ? "#F43F5E" : colors.textSecondary }]}>
                                                    {review.likeCount || 0}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={[styles.emptyState, { backgroundColor: colors.card, height: 100, justifyContent: 'center' }]}>
                                <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Action Footer */}
            <View style={[styles.footer, { backgroundColor: colors.card }]}>
                <View style={styles.footerLeft}>
                    <Text style={styles.footerLabel}>Starting from</Text>
                    <Text style={[styles.footerPrice, { color: colors.text }]}>
                        {services[0]?.pricePerMinute?.toLocaleString() || '15,000'} <Text style={styles.footerCurrency}>UZS</Text>
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.bookBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (branch.partnerType === 'SERVICE') {
                            // Logic for calling master
                        } else {
                            // Logic for navigation/booking
                        }
                    }}
                >
                    <Text style={styles.bookBtnText}>
                        {branch.partnerType === 'SERVICE' ? 'Call Master' : 'Start Now'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Review Modal */}
            <Modal
                visible={isReviewModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsReviewModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Write a Review</Text>
                            <TouchableOpacity onPress={() => setIsReviewModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Rate your experience</Text>
                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                                    <Ionicons
                                        name={s <= userRating ? "star" : "star-outline"}
                                        size={40}
                                        color="#FBBF24"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={[styles.reviewInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="Tell us about your experience..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={userComment}
                            onChangeText={setUserComment}
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSubmitReview}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit Review</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { fontSize: 20, fontWeight: '800', marginVertical: 16 },
    backBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16 },
    backBtnText: { color: '#fff', fontWeight: '800' },
    scrollContent: { paddingBottom: 140 },

    heroSection: { height: 420, width: '100%', position: 'relative' },
    heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroGradient: { ...StyleSheet.absoluteFillObject },
    navHeader: { position: 'absolute', top: 0, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
    navRight: { flexDirection: 'row', gap: 10 },
    blurBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

    heroContent: { position: 'absolute', bottom: 30, left: 20, right: 20 },
    badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
    typeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    branchTitle: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingVal: { color: '#fff', fontSize: 14, fontWeight: '800' },
    ratingCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
    metaDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' },
    distanceBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    distanceVal: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700' },

    mainWrapper: { marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: 'transparent', paddingHorizontal: 20 },

    quickActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 32 },
    actionCard: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 12, fontWeight: '700' },

    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800' },

    locationCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
    addressText: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 22 },

    servicesGrid: { gap: 16 },
    serviceCard: { padding: 20, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    serviceMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    serviceText: { flex: 1, marginRight: 16 },
    serviceName: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    serviceDesc: { fontSize: 14, lineHeight: 20 },
    serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    serviceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    priceValue: { fontSize: 20, fontWeight: '900' },
    priceUnit: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
    durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    durationText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

    emptyState: { padding: 40, alignItems: 'center', borderRadius: 24, gap: 12 },
    emptyText: { color: '#94A3B8', fontWeight: '600', textAlign: 'center' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 20 },
    footerLeft: { gap: 2 },
    footerLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
    footerPrice: { fontSize: 24, fontWeight: '900' },
    footerCurrency: { fontSize: 14, fontWeight: '700' },
    bookBtn: { flex: 1, marginLeft: 24, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    bookBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },

    // Review Styles
    reviewsList: { gap: 12 },
    reviewCard: { padding: 16, borderRadius: 20 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    reviewUser: { fontSize: 15, fontWeight: '700' },
    reviewRating: { flexDirection: 'row', gap: 2 },
    reviewComment: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
    reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    likeCount: { fontSize: 13, fontWeight: '700' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: '800' },
    ratingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
    starRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
    reviewInput: { borderRadius: 20, padding: 16, fontSize: 16, height: 120, textAlignVertical: 'top', borderWidth: 1, marginBottom: 24 },
    submitBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' }
});
