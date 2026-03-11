import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ChatsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
            </View>
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={80} color="#475569" />
                <Text style={styles.emptyText}>No messages yet</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '600',
    },
});
