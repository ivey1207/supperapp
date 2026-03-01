import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

export default function SupportScreen() {
    const colors = Colors.dark;

    const handleContact = (type: 'phone' | 'telegram') => {
        if (type === 'phone') Linking.openURL('tel:+998901234567');
        if (type === 'telegram') Linking.openURL('https://t.me/superapp_support');
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="help-buoy" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>Нужна помощь?</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Мы всегда на связи и готовы решить любой ваш вопрос</Text>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleContact('telegram')}
                >
                    <View style={[styles.cardIcon, { backgroundColor: '#0088cc20' }]}>
                        <Ionicons name="paper-plane" size={24} color="#0088cc" />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Написать в Telegram</Text>
                        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Самый быстрый способ получить ответ</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleContact('phone')}
                >
                    <View style={[styles.cardIcon, { backgroundColor: '#10b98120' }]}>
                        <Ionicons name="call" size={24} color="#10b981" />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Позвонить в поддержку</Text>
                        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Для срочных вопросов (24/7)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Частые вопросы</Text>
                <View style={[styles.faqBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.faqItem, { color: colors.text }]}>Как привязать карту?</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.faqItem, { color: colors.text }]}>Где посмотреть историю трат?</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.faqItem, { color: colors.text }]}>Как работает бонусная система?</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 24, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
    iconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    cardDesc: { fontSize: 13 },
    faqBox: { borderRadius: 20, borderWidth: 1, paddingVertical: 8 },
    faqItem: { padding: 16, fontSize: 15, fontWeight: '600' },
    divider: { height: 1, marginHorizontal: 16 }
});
