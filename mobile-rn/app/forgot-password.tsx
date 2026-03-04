import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { forgotPassword, resetPassword } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState<'phone' | 'reset'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [devOtp, setDevOtp] = useState<string | undefined>();
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];

    const handleRequestReset = async () => {
        if (!phone.trim()) { setError('Enter your phone number'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await forgotPassword({ phone: phone.trim() });
            setDevOtp(res.devOtp);
            setStep('reset');
        } catch (e: any) {
            setError(e.response?.data?.message || 'Error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!otp.trim() || !newPassword.trim()) { setError('All fields are required'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        setError('');
        setLoading(true);
        try {
            await resetPassword({ phone: phone.trim(), otp: otp.trim(), newPassword: newPassword.trim() });
            alert('Password successfully reset');
            router.replace('/login');
        } catch (e: any) {
            setError(e.response?.data?.message || 'Invalid code or error');
        } finally {
            setLoading(false);
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
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.introSection}>
                            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                {step === 'phone' ? 'Enter your phone number to receive a reset code' : 'Enter the code and your new password'}
                            </Text>
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.card }]}>
                            {step === 'phone' ? (
                                <View style={styles.form}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                                    <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="+998 00 000 00 00"
                                            placeholderTextColor="#94A3B8"
                                            value={phone}
                                            onChangeText={setPhone}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                    <TouchableOpacity style={[styles.mainBtn, { backgroundColor: colors.primary }]} onPress={handleRequestReset} disabled={loading}>
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.form}>
                                    {devOtp && (
                                        <View style={styles.devTag}>
                                            <Text style={styles.devText}>Dev Reset Code: {devOtp}</Text>
                                        </View>
                                    )}
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Reset Code</Text>
                                    <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Enter 6-digit code"
                                            placeholderTextColor="#94A3B8"
                                            value={otp}
                                            onChangeText={setOtp}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>

                                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>New Password</Text>
                                    <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Minimum 6 characters"
                                            placeholderTextColor="#94A3B8"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry
                                        />
                                    </View>

                                    <TouchableOpacity style={[styles.mainBtn, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={handleReset} disabled={loading}>
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Set New Password</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
    content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 40 },
    introSection: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    card: { borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 10 },
    form: { width: '100%' },
    label: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, height: 60 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '700' },
    mainBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, marginTop: 12 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    errorText: { color: '#EF4444', fontSize: 14, marginTop: 20, textAlign: 'center', fontWeight: '700' },
    devTag: { backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    devText: { color: '#16A34A', fontSize: 14, fontWeight: '800', textAlign: 'center' },
});
