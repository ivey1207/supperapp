import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, useColorScheme, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SupportScreen() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const router = useRouter();

    const handleCall = () => {
        Linking.openURL('tel:+998901234567');
    };

    const handleTelegram = () => {
        Linking.openURL('https://t.me/superapp_support');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.illustrationSection}>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={['#3B82F6', '#1D4ED8']}
                            style={styles.iconGradient}
                        />
                        <Ionicons name="headset" size={60} color="#fff" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>How can we help?</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Our specialized team is available 24/7 to assist you with any questions or issues.
                    </Text>
                </View>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={[styles.primaryOption, { backgroundColor: colors.primary }]}
                        onPress={handleTelegram}
                        activeOpacity={0.8}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="paper-plane" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.optionText}>
                            <Text style={styles.optionTitleLight}>Chat with Us</Text>
                            <Text style={styles.optionSubLight}>Telegram Support Channel</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryOption, { backgroundColor: colors.card }]}
                        onPress={handleCall}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: '#F1F5F9' }]}>
                            <Ionicons name="call-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.optionText}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>Call Center</Text>
                            <Text style={styles.optionSub}>+998 90 123 45 67</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryOption, { backgroundColor: colors.card }]}
                        onPress={() => { }}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: '#F1F5F9' }]}>
                            <Ionicons name="mail-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.optionText}>
                            <Text style={[styles.optionTitle, { color: colors.text }]}>Email Support</Text>
                            <Text style={styles.optionSub}>support@superapp.uz</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                <View style={styles.faqSection}>
                    <Text style={[styles.faqTitle, { color: colors.text }]}>Quick FAQ</Text>
                    <View style={styles.faqItem}>
                        <Text style={[styles.faqQuestion, { color: colors.text }]}>How to book a service?</Text>
                        <Text style={styles.faqAnswer}>Simply select a branch on the map or home screen, choose your service and follow the instructions.</Text>
                    </View>
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
    scrollContent: { paddingHorizontal: 24, paddingBottom: 60, paddingTop: 20 },
    illustrationSection: { alignItems: 'center', marginBottom: 40 },
    iconContainer: { width: 140, height: 140, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    iconGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 48 },
    title: { fontSize: 28, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, color: '#64748B', paddingHorizontal: 10 },
    optionsContainer: { gap: 16 },
    primaryOption: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
    optionIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    optionText: { flex: 1, gap: 2 },
    optionTitleLight: { color: '#fff', fontSize: 18, fontWeight: '800' },
    optionSubLight: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
    secondaryOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    optionTitle: { fontSize: 16, fontWeight: '800' },
    optionSub: { color: '#64748B', fontSize: 13, fontWeight: '600' },
    faqSection: { marginTop: 40 },
    faqTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
    faqItem: { marginBottom: 24 },
    faqQuestion: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    faqAnswer: { color: '#64748B', fontSize: 14, lineHeight: 20, fontWeight: '500' }
});
