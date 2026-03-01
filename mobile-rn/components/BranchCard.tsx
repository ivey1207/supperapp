import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { Branch, getFileUrl } from '@/lib/api';

interface BranchCardProps {
    branch: Branch;
    onPress: () => void;
    index: number;
    isSponsored?: boolean;
}

export default function BranchCard({ branch, onPress, index, isSponsored }: BranchCardProps) {
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];

    // Mock data for WOW effect
    const rating = (4.5 + (index % 5) * 0.1).toFixed(1);
    const reviews = 100 + (index * 23) % 500;
    const time = 15 + (index * 5) % 30;
    const distance = (0.5 + (index * 0.3)).toFixed(1);

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }, isSponsored && styles.sponsoredCard]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.imageWrapper}>
                <Image
                    source={{ uri: getFileUrl(branch.photoUrl) || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&q=80' }}
                    style={styles.image}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {/* Status Badges */}
                <View style={styles.topBadges}>
                    {isSponsored && (
                        <View style={[styles.badge, styles.sponsoredBadge]}>
                            <Text style={styles.sponsoredText}>Реклама</Text>
                        </View>
                    )}
                    <View style={[styles.badge, styles.timeBadge, isSponsored && { marginLeft: 'auto' }]}>
                        <Ionicons name="time" size={12} color="#000" />
                        <Text style={styles.timeText}>15 мин</Text>
                    </View>
                    {!isSponsored && index % 2 === 0 && ( // Only show promo if not sponsored
                        <View style={styles.promoBadge}>
                            <Text style={styles.promoText}>-20%</Text>
                        </View>
                    )}
                </View>

                {/* Bottom Overlay Info */}
                <View style={styles.bottomInfo}>
                    <Text style={styles.branchName} numberOfLines={1}>{branch.name}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.ratingBox}>
                            <FontAwesome name="star" size={12} color="#fbbf24" />
                            <Text style={styles.ratingText}>{rating}</Text>
                            <Text style={styles.reviewsText}>({reviews}+)</Text>
                        </View>
                        <View style={styles.dot} />
                        <Text style={styles.distanceText}>{distance} км</Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
                    {branch.address || 'Адрес не указан'}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.typeText, { color: colors.primary }]}>
                        {branch.partnerType === 'SERVICE' ? 'Сервис' : 'Мойка'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    sponsoredCard: {
        borderWidth: 2,
        borderColor: '#fbbf24', // Gold border for sponsored
    },
    imageWrapper: {
        height: 200,
        width: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    topBadges: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    sponsoredBadge: {
        backgroundColor: '#fbbf24',
    },
    sponsoredText: {
        color: '#000',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    timeBadge: {
        backgroundColor: '#fff',
    },
    timeText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#000',
    },
    promoBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    promoText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    bottomInfo: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    branchName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    reviewsText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    distanceText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    address: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        marginRight: 12,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
