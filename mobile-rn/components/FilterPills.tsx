import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const FILTERS = [
    { id: 'all', label: 'Все', icon: 'apps' },
    { id: 'delivery', label: 'Доставка 0 сум', icon: 'bicycle' },
    { id: 'time', label: 'До 30 мин', icon: 'time' },
    { id: 'rating', label: 'Рейтинг 4.5+', icon: 'star' },
    { id: 'price', label: 'Недорогие', icon: 'wallet' },
];

export default function FilterPills() {
    const [activeFilter, setActiveFilter] = React.useState('all');
    const scheme = useColorScheme() ?? 'dark';
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
                                { backgroundColor: colors.card, borderColor: colors.border },
                                isActive && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }
                            ]}
                            onPress={() => setActiveFilter(filter.id)}
                            activeOpacity={0.8}
                        >
                            {filter.icon && (
                                <Ionicons
                                    name={filter.icon as any}
                                    size={16}
                                    color={isActive ? '#fff' : colors.textSecondary}
                                    style={{ marginRight: 6 }}
                                />
                            )}
                            <Text style={[styles.pillText, { color: colors.textSecondary }, isActive && styles.activePillText]}>
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
        gap: 10,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    activePillText: {
        color: '#fff',
        fontWeight: '700',
    },
});
