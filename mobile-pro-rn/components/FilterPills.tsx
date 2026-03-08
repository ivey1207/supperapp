import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const FILTERS = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'free_now', label: 'Near Me', icon: 'location' },
    { id: '24_7', label: '24/7', icon: 'time' },
    { id: 'cafe', label: 'Cafe', icon: 'cafe' },
    { id: 'top_rating', label: 'Top Rated', icon: 'star' },
];

interface FilterPillsProps {
    activeFilter: string;
    onChangeFilter: (filterId: string) => void;
}

export default function FilterPills({ activeFilter, onChangeFilter }: FilterPillsProps) {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {FILTERS.map((filter) => {
                    const isActive = activeFilter === filter.id;
                    return (
                        <TouchableOpacity
                            key={filter.id}
                            style={[
                                styles.pill,
                                { backgroundColor: isActive ? colors.primary : colors.card, borderWidth: isActive ? 0 : 1, borderColor: colors.border },
                            ]}
                            onPress={() => onChangeFilter(filter.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.text }]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
