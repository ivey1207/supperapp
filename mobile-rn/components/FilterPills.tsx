import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const FILTERS = [
    { id: 'all', label: 'Все', icon: 'apps' },
    { id: 'free_now', label: 'Свободно сейчас', icon: 'flash' },
    { id: '24_7', label: 'Круглосуточно 24/7', icon: 'moon' },
    { id: 'cafe', label: 'Есть кафе / Wi-Fi', icon: 'cafe' },
    { id: 'in_app_pay', label: 'Оплата в приложении', icon: 'card' },
    { id: 'top_rating', label: 'Топ рейтинг 4.5+', icon: 'star' },
    { id: 'my_car', label: 'Для моего авто', icon: 'car-sport' },
];

interface FilterPillsProps {
    activeFilter: string;
    onChangeFilter: (filterId: string) => void;
}

export default function FilterPills({ activeFilter, onChangeFilter }: FilterPillsProps) {
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
                            onPress={() => onChangeFilter(filter.id)}
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
