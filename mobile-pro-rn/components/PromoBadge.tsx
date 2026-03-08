import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

interface PromoBadgeProps {
    value: string;
    type?: 'discount' | 'bonus' | 'info';
}

export default function PromoBadge({ value, type = 'discount' }: PromoBadgeProps) {
    const colorScheme = useColorScheme() ?? 'dark';
    const colors = Colors[colorScheme];

    const getBgColor = () => {
        switch (type) {
            case 'bonus': return '#10B981';
            case 'info': return '#3b82f6';
            default: return '#F43F5E';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: getBgColor() }]}>
            <Text style={styles.text}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
});
