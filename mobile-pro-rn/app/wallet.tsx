import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TRANSACTIONS = [
    { id: 1, title: 'Wallet Top-up (Payme)', amount: '+100,000 UZS', date: 'Oct 25, 14:30', isPositive: true },
    { id: 2, title: 'Car Wash "Lux" @ Central', amount: '-45,000 UZS', date: 'Oct 24, 18:00', isPositive: false },
    { id: 3, title: 'Coffee Purchase', amount: '-15,000 UZS', date: 'Oct 24, 18:15', isPositive: false },
];

export default function WalletScreen() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const router = useRouter();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>My Wallet</Text>
                    <TouchableOpacity style={styles.headerAction}>
                        <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Balance Card */}
                <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.balanceLabel}>Current Balance</Text>
                            <Text style={styles.balanceAmount}>240,000 <Text style={styles.currency}>UZS</Text></Text>
                        </View>
                        <Ionicons name="card" size={32} color="rgba(255,255,255,0.4)" />
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.cardNumber}>**** **** **** 1234</Text>
                        <View style={styles.cardChip} />
                    </View>
                </LinearGradient>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.actionText, { color: colors.text }]}>Add</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                            <Ionicons name="paper-plane" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.actionText, { color: colors.text }]}>Send</Text>
                    </View>
                    <View style={styles.actionItem}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                            <Ionicons name="receipt" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.actionText, { color: colors.text }]}>History</Text>
                    </View>
                </View>

                {/* Transactions */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
                    <TouchableOpacity>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>View More</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.transactionsContainer}>
                    {TRANSACTIONS.map((tx) => (
                        <TouchableOpacity key={tx.id} style={[styles.txItem, { backgroundColor: colors.card }]} activeOpacity={0.7}>
                            <View style={[styles.txIconWrapper, { backgroundColor: scheme === 'dark' ? '#1E293B' : '#F1F5F9' }]}>
                                <Ionicons
                                    name={tx.isPositive ? 'arrow-down-outline' : 'cart-outline'}
                                    size={22}
                                    color={tx.isPositive ? '#10B981' : colors.primary}
                                />
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>{tx.title}</Text>
                                <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: tx.isPositive ? '#10B981' : colors.text }]}>
                                {tx.amount}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 10 },

    balanceCard: { borderRadius: 32, padding: 24, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
    balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 4 },
    currency: { fontSize: 18, fontWeight: '600' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 16, letterSpacing: 2, fontWeight: '600' },
    cardChip: { width: 40, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },

    actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 32, marginBottom: 40 },
    actionItem: { alignItems: 'center', gap: 8 },
    actionBtn: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    actionText: { fontSize: 12, fontWeight: '700' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    transactionsContainer: { gap: 12 },
    txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
    txIconWrapper: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    txInfo: { flex: 1, gap: 2 },
    txTitle: { fontSize: 15, fontWeight: '700' },
    txDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    txAmount: { fontSize: 15, fontWeight: '800' }
});
