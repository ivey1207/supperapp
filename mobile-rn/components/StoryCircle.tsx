import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

interface StoryCircleProps {
    item: {
        id: string | number;
        name: string;
        image: string;
        seen?: boolean;
        type?: 'PROMO' | 'USER' | string;
    };
    onPress: () => void;
}

export default function StoryCircle({ item, onPress }: StoryCircleProps) {
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];

    // IG Style Gradients
    let gradientColors: any;

    if (item.seen) {
        // Seen: subtle gray
        gradientColors = scheme === 'dark' ? ['#334155', '#334155'] : ['#cbd5e1', '#cbd5e1'];
    } else if (item.type === 'PROMO') {
        // Promo: Green/Neon gradient (as seen in user screenshot)
        gradientColors = ['#22c55e', '#10b981', '#059669'];
    } else {
        // User/Default: Classic IG vibrant gradient
        gradientColors = ['#833ab4', '#fd1d1d', '#fcb045'];
    }

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.avatarWrapper}>
                <LinearGradient
                    colors={gradientColors}
                    style={styles.gradientBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={[styles.innerCircle, { backgroundColor: colors.background }]}>
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: item.image }} style={styles.image} />
                    </View>
                </View>
            </View>
            <Text style={[styles.name, { color: item.seen ? colors.textSecondary : colors.text }]} numberOfLines={1}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: 76,
    },
    avatarWrapper: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 34,
    },
    innerCircle: {
        width: 63,
        height: 63,
        borderRadius: 31.5,
        padding: 2.5, // The white space/gap
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    name: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '500',
        width: '100%',
        textAlign: 'center',
    },
});
