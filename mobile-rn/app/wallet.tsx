import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TRANSACTIONS = [
    { id: 1, title: 'Пополнение баланса (Payme)', amount: '+100 000 UZS', date: '25 Октября, 14:30', isPositive: true },
    { id: 2, title: 'Мойка "Люкс" в филиале Центр', amount: '-45 000 UZS', date: '24 Октября, 18:00', isPositive: false },
    { id: 3, title: 'Покупка кофе', amount: '-15 000 UZS', date: '24 Октября, 18:15', isPositive: false },
];

export default function WalletScreen() {
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];
    const router = useRouter();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Кошелёк</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Balance Card */}
                <LinearGradient
                    colors={['#3b82f6', '#1d4ed8']}
                    style={styles.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.balanceLabel}>Ваш баланс</Text>
                    <Text style={styles.balanceAmount}>240 000 <Text style={styles.currency}>UZS</Text></Text>

                    <View style={styles.cardInfo}>
                        <Text style={styles.cardNumber}>**** **** **** 1234</Text>
                        <FontAwesome name="cc-visa" size={24} color="#fff" />
                    </View>
                </LinearGradient>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
                        <View style={[styles.iconCircle, { backgroundColor: '#10b98120' }]}>
                            <Ionicons name="add" size={24} color="#10b981" />
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Пополнить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
                        <View style={[styles.iconCircle, { backgroundColor: '#f59e0b20' }]}>
                            <Ionicons name="send" size={20} color="#f59e0b" />
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Перевод</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
                        <View style={[styles.iconCircle, { backgroundColor: '#8b5cf620' }]}>
                            <Ionicons name="time" size={20} color="#8b5cf6" />
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>История</Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Последние операции</Text>
                <View style={styles.transactionsList}>
                    {TRANSACTIONS.map((tx) => (
                        <View key={tx.id} style={[styles.txItem, { borderBottomColor: colors.border }]}>
                            <View style={[styles.txIconWrapper, { backgroundColor: tx.isPositive ? '#10b98120' : '#ef444420' }]}>
                                <Ionicons
                                    name={tx.isPositive ? 'arrow-down' : 'card'}
                                    size={20}
                                    color={tx.isPositive ? '#10b981' : '#ef4444'}
                                />
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>{tx.title}</Text>
                                <Text style={styles.txDate}>{tx.date}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: tx.isPositive ? '#10b981' : colors.text }]}>
                                {tx.amount}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    balanceCard: { borderRadius: 24, padding: 24, marginTop: 10, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500', marginBottom: 8 },
    balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 32 },
    currency: { fontSize: 20, fontWeight: '600' },
    cardInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardNumber: { color: 'rgba(255,255,255,0.8)', fontSize: 16, letterSpacing: 2, fontWeight: '500' },

    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
    actionBtn: { flex: 1, backgroundColor: '#1e293b', marginHorizontal: 6, paddingVertical: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    actionText: { fontSize: 13, fontWeight: '600' },

    sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 32, marginBottom: 16 },
    transactionsList: { backgroundColor: 'transparent' },
    txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    txIconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    txInfo: { flex: 1, marginRight: 12 },
    txTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    txDate: { fontSize: 13, color: '#64748b' },
    txAmount: { fontSize: 16, fontWeight: '800' }
});
