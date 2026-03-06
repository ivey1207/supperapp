import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Branch, getFileUrl } from '@/lib/api';

interface BranchCardProps {
    branch: Branch;
    onPress: () => void;
    index: number;
    isSponsored?: boolean;
    style?: any;
}

export default function BranchCard({ branch, onPress, index, style }: BranchCardProps) {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];

    const rating = (branch.rating !== undefined && branch.rating !== null) ? branch.rating.toFixed(1) : '4.5';
    const reviewCountDisplay = branch.reviewCount !== undefined ? `(${branch.reviewCount})` : '';

    const distance = branch.distance !== undefined
        ? (branch.distance < 1
            ? `${(branch.distance * 1000).toFixed(0)} ft` // Adapting to mockup's miles/ft style
            : `${branch.distance.toFixed(1)} miles away`)
        : '0.8 miles away';

    const isOpen = index % 3 !== 0; // Mock status
    const price = 4.95 + (index * 2);

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }, style]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: getFileUrl(branch.photoUrl || (branch.images && branch.images[0])) || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&q=80' }}
                    style={styles.image}
                />

                <View style={styles.ratingBadge}>
                    <FontAwesome name="star" size={10} color="#FFD700" />
                    <Text style={styles.ratingText}>{rating} {reviewCountDisplay}</Text>
                </View>

                {index === 0 && (
                    <View style={styles.promoBadge}>
                        <Text style={styles.promoText}>SAVE 10%</Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{branch.name}</Text>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Regular</Text>
                        <Text style={[styles.priceValue, { color: colors.text }]}>${price.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <Text style={[styles.statusText, { color: isOpen ? '#10B981' : '#EF4444' }]}>
                        {isOpen ? 'OPEN' : 'CLOSED'}
                    </Text>
                    <View style={styles.dot} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{distance}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 8,
    },
    imageContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    ratingBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    promoBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    promoText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    content: {
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        marginRight: 8,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#94A3B8',
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
