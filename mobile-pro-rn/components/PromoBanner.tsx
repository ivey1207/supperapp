import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Promotion, getFileUrl } from '../lib/api';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.85;

interface PromoBannerProps {
    promotions: Promotion[];
    onPress?: (promo: Promotion) => void;
}

export default function PromoBanner({ promotions, onPress }: PromoBannerProps) {
    const colorScheme = useColorScheme() ?? 'dark';
    const colors = Colors[colorScheme];

    if (!promotions || promotions.length === 0) return null;

    const renderItem = ({ item }: { item: Promotion }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cardContainer}
            onPress={() => onPress?.(item)}
        >
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Image
                    source={{ uri: getFileUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=800' }}
                    style={styles.image}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />
                <View style={styles.content}>
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.badgeText}>{item.discountValue || 'Акция'}</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={promotions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + 20}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    listContent: {
        paddingHorizontal: 20,
        gap: 16,
    },
    cardContainer: {
        width: ITEM_WIDTH,
    },
    card: {
        height: 160,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    description: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '500',
    },
});
