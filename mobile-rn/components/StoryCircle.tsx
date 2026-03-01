import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

interface StoryCircleProps {
    item: { id: number; name: string; image: string; seen?: boolean };
    onPress: () => void;
}

export default function StoryCircle({ item, onPress }: StoryCircleProps) {
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.avatarWrapper}>
                <LinearGradient
                    colors={item.seen ? ['#94a3b8', '#64748b'] : ['#FC3F1D', '#F97316', '#fbbf24']}
                    style={styles.gradientBorder}
                />
                <View style={[styles.innerCircle, { backgroundColor: colors.background }]}>
                    <Image source={{ uri: item.image }} style={styles.image} />
                </View>
            </View>
            <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
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
        width: 62,
        height: 62,
        borderRadius: 31,
        borderWidth: 2,
        borderColor: 'transparent',
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
        fontWeight: '600',
        width: '100%',
        textAlign: 'center',
    },
});
