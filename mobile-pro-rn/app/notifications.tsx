import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const { token } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['notifications', token],
        queryFn: () => getNotifications(token!),
        enabled: !!token,
    });

    const readMutation = useMutation({
        mutationFn: (id: string) => markNotificationRead(token!, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'ORDER_STATUS': return { name: 'package-variant', color: '#3b82f6' };
            case 'PROMOTION': return { name: 'tag', color: '#ef4444' };
            case 'SYSTEM': return { name: 'cog', color: '#94a3b8' };
            default: return { name: 'bell', color: '#f59e0b' };
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="bell-off-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications yet</Text>
                    </View>
                ) : (
                    notifications.map((n) => (
                        <TouchableOpacity
                            key={n.id}
                            style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => {
                                if (!n.read) readMutation.mutate(n.id);
                                // logic to navigate to relatedId could be added here
                            }}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: getIcon(n.type).color + '20' }]}>
                                <MaterialCommunityIcons name={getIcon(n.type).name as any} size={24} color={getIcon(n.type).color} />
                            </View>
                            <View style={styles.textContainer}>
                                <View style={styles.titleRow}>
                                    <Text style={[styles.title, { color: colors.text }]}>{n.title}</Text>
                                    {!n.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                                </View>
                                <Text style={[styles.message, { color: colors.textSecondary }]}>{n.message}</Text>
                                <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(n.createdAt)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
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
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: { flex: 1, gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 16, fontWeight: '800' },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    message: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    date: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, fontWeight: '700' },
});
