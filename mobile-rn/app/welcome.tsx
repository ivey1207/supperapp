import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const changeLanguage = async (lng: string) => {
        await i18n.changeLanguage(lng);
        await AsyncStorage.setItem('user_language', lng);
    };

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Image
                source={require('../assets/images/welcome-pattern.png')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            />
            <LinearGradient
                colors={['rgba(15, 23, 42, 0.7)', 'rgba(15, 23, 42, 0.95)', '#0F172A']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.content}>
                <View style={styles.langBar}>
                    {['ru', 'uz', 'en', 'tr'].map((l) => (
                        <TouchableOpacity
                            key={l}
                            onPress={() => changeLanguage(l)}
                            style={[styles.langBtn, i18n.language === l && styles.langBtnActive]}
                        >
                            <Text style={[styles.langText, i18n.language === l && styles.langTextActive]}>{l.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Animated.View style={[styles.topSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.logoBadge}>
                        <Ionicons name="car-sport" size={50} color="#3B82F6" />
                    </View>
                    <Text style={styles.brandName}>{t('welcome.title').split(' ')[0]} <Text style={{ color: '#3B82F6' }}>{t('welcome.title').split(' ')[1]}</Text></Text>
                    <Text style={styles.tagline}>{t('welcome.subtitle')}</Text>
                </Animated.View>

                <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        activeOpacity={0.9}
                        onPress={() => router.push('/login')}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBtn}
                        >
                            <Text style={styles.primaryBtnText}>{t('welcome.login')}</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        activeOpacity={0.7}
                        onPress={() => router.push('/register')}
                    >
                        <Text style={styles.secondaryBtnText}>{t('welcome.register')}</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                        {t('welcome.terms')}
                    </Text>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 40 },
    topSection: { alignItems: 'center', marginTop: height * 0.1 },
    logoBadge: {
        width: 100,
        height: 100,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    brandName: { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center' },
    tagline: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24, fontWeight: '500' },
    langBar: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
    langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    langBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    langText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    langTextActive: { color: '#fff' },
    bottomSection: { gap: 16, marginBottom: 20 },
    primaryBtn: { height: 64, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
    gradientBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    secondaryBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footerNote: { color: '#64748B', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 12 },
    link: { color: '#3B82F6', fontWeight: '600' }
});
