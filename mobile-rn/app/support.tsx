import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SupportScreen() {
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];
    const router = useRouter();

    const handleCall = () => {
        Linking.openURL('tel:+998901234567');
    };

    const handleTelegram = () => {
        Linking.openURL('https://t.me/superapp_support');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Служба поддержки</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.blobContainer}>
                    <LinearGradient
                        colors={['#3b82f630', 'transparent']}
                        style={styles.blob}
                    />
                    <FontAwesome name="headphones" size={80} color={colors.primary} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Чем мы можем помочь?</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Наши специалисты на связи 24/7 и готовы ответить на любые ваши вопросы.
                </Text>

                <TouchableOpacity
                    style={[styles.button, styles.telegramButton]}
                    onPress={handleTelegram}
                    activeOpacity={0.8}
                >
                    <FontAwesome name="telegram" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Написать в Telegram</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                    onPress={handleCall}
                    activeOpacity={0.8}
                >
                    <Ionicons name="call" size={22} color={colors.text} />
                    <Text style={[styles.buttonText, { color: colors.text }]}>Позвонить +998 90 123 45 67</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 40 },
    blobContainer: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    blob: { ...StyleSheet.absoluteFillObject, borderRadius: 80 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 56, borderRadius: 16, marginBottom: 16, gap: 12 },
    telegramButton: { backgroundColor: '#2AABEE' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
