import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getFavoriteBranches } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';
import { useRouter } from 'expo-router';
import BranchCard from '@/components/BranchCard';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const { token } = useAuth();
    const router = useRouter();

    const { data: favorites = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['favorites', token],
        queryFn: () => getFavoriteBranches(token!),
        enabled: !!token,
    });

    if (isLoading && !isRefetching) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
            >
                {favorites.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="heart-dislike-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No favorites saved</Text>
                        <TouchableOpacity
                            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <Text style={styles.exploreBtnText}>Explore Places</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {favorites.map((branch, idx) => (
                            <BranchCard
                                key={branch.id}
                                branch={branch}
                                index={idx}
                                onPress={() => router.push(`/branch/${branch.id}` as any)}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    scrollContent: { padding: 16 },
    list: { gap: 16 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: '700' },
    exploreBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
        marginTop: 8,
    },
    exploreBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
});
