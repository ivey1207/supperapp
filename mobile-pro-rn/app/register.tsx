import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { updateProfile } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PolicyModal from '@/components/PolicyModal';
import '@/lib/i18n';

export default function RegisterScreen() {
    const { register, confirmRegistration } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [agreedToPolicy, setAgreedToPolicy] = useState(false);
    const [isPolicyVisible, setIsPolicyVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];

    const handleRegister = async () => {
        if (!showOtp) {
            if (!fullName.trim() || !phone.trim() || !email.trim() || password.length < 6) {
                setError(t('auth.fillAll') || 'Please fill all fields correctly');
                return;
            }
            if (!agreedToPolicy) {
                setError(t('auth.agreeTermsError') || 'Agree to terms');
                return;
            }

            setError('');
            setLoading(true);
            try {
                await register({ fullName, phone, email, password });
                setShowOtp(true);
            } catch (e: any) {
                setError(e.response?.data?.message || 'Error occurred during registration');
            } finally {
                setLoading(false);
            }
        } else {
            if (otp.length < 6) {
                setError(t('auth.enterOtp') || 'Enter valid OTP');
                return;
            }
            setError('');
            setLoading(true);
            try {
                await confirmRegistration(phone, otp);
                router.replace('/(tabs)' as any);
            } catch (e: any) {
                setError(e.response?.data?.message || 'Invalid or expired OTP');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
            <LinearGradient
                colors={scheme === 'dark' ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.signUp')}</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.introSection}>
                            <Text style={[styles.title, { color: colors.text }]}>{t('auth.createAccount')}</Text>
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            <View style={styles.form}>
                                {!showOtp ? (
                                    <>
                                        <View style={styles.inputWrapper}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.fullName')}</Text>
                                            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                                <TextInput
                                                    style={[styles.input, { color: colors.text }]}
                                                    placeholder="..."
                                                    placeholderTextColor="#94A3B8"
                                                    value={fullName}
                                                    onChangeText={setFullName}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputWrapper}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Телефон</Text>
                                            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                                <TextInput
                                                    style={[styles.input, { color: colors.text }]}
                                                    placeholder="+998..."
                                                    placeholderTextColor="#94A3B8"
                                                    value={phone}
                                                    onChangeText={setPhone}
                                                    keyboardType="phone-pad"
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputWrapper}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
                                            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                                <TextInput
                                                    style={[styles.input, { color: colors.text }]}
                                                    placeholder="email@example.com"
                                                    placeholderTextColor="#94A3B8"
                                                    value={email}
                                                    onChangeText={setEmail}
                                                    keyboardType="email-address"
                                                    autoCapitalize="none"
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputWrapper}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
                                            <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                                <TextInput
                                                    style={[styles.input, { color: colors.text }]}
                                                    placeholder="••••••••"
                                                    placeholderTextColor="#94A3B8"
                                                    value={password}
                                                    onChangeText={setPassword}
                                                    secureTextEntry
                                                />
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.inputWrapper}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>OTP Код</Text>
                                        <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                            <TextInput
                                                style={[styles.input, { color: colors.text }]}
                                                placeholder="123456"
                                                placeholderTextColor="#94A3B8"
                                                value={otp}
                                                onChangeText={setOtp}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                            />
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.policyRow}
                                    onPress={() => setAgreedToPolicy(!agreedToPolicy)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: colors.border },
                                        agreedToPolicy && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}>
                                        {agreedToPolicy && <Ionicons name="checkmark" size={16} color="#fff" />}
                                    </View>
                                    <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                                        {t('auth.agreeTerms')}
                                    </Text>
                                </TouchableOpacity>

                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <TouchableOpacity
                                    style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleRegister}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.btnText}>{showOtp ? 'Подтвердить OTP' : t('auth.completeRegistration')}</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => router.push('/login' as any)} style={styles.toggleLink}>
                                    <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                                        {t('auth.alreadyHaveAccount')} <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('welcome.login')}</Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <PolicyModal
                visible={isPolicyVisible}
                onClose={() => setIsPolicyVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
    introSection: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, color: '#64748B', paddingHorizontal: 20 },
    card: { borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 10 },
    form: { gap: 16 },
    inputWrapper: { gap: 8 },
    label: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginLeft: 4 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, height: 60 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '700' },
    policyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    policyText: { fontSize: 14, fontWeight: '600', flex: 1 },
    mainBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, marginTop: 12 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    toggleLink: { marginTop: 16, alignItems: 'center' },
    toggleText: { fontSize: 14, fontWeight: '600' },
    errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center', fontWeight: '700' }
});
