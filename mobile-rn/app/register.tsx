import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import PolicyModal from '@/components/PolicyModal';

export default function RegisterScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [carModel, setCarModel] = useState('');
    const [agreedToPolicy, setAgreedToPolicy] = useState(false);
    const [isPolicyVisible, setIsPolicyVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const colors = Colors.dark;

    const handleRegister = async () => {
        if (!fullName.trim()) { setError('Введите ваше имя'); return; }
        if (!agreedToPolicy) { setError('Пожалуйста, примите политику конфиденциальности'); return; }
        setError('');
        setLoading(true);
        try {
            if (!token) throw new Error('No token');
            await updateProfile(token, { fullName, carModel });
            router.replace('/(tabs)' as any);
        } catch (e: any) {
            setError(e.message || 'Ошибка при регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Добро пожаловать!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Пожалуйста, заполните данные профиля для продолжения</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>ФИО</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Иван Иванов"
                                placeholderTextColor={colors.textSecondary}
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Марка авто (необязательно)</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="car-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Chevrolet Gentra"
                                placeholderTextColor={colors.textSecondary}
                                value={carModel}
                                onChangeText={setCarModel}
                            />
                        </View>
                    </View>

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
                        <View style={styles.policyTextWrapper}>
                            <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                                Я согласен с{' '}
                                <Text
                                    style={{ color: colors.primary, fontWeight: '700' }}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setIsPolicyVisible(true);
                                    }}
                                >
                                    политикой конфиденциальности
                                </Text>
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Завершить регистрацию</Text>}
                    </TouchableOpacity>
                </View>

                <PolicyModal
                    visible={isPolicyVisible}
                    onClose={() => setIsPolicyVisible(false)}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingTop: 60 },
    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
    subtitle: { fontSize: 16, lineHeight: 22 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, paddingVertical: 16, fontSize: 16 },
    policyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    policyTextWrapper: { flex: 1 },
    policyText: { fontSize: 14, lineHeight: 20 },
    button: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    errorText: { color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: '600' }
});
