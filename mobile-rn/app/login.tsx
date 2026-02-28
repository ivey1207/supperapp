import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';

export default function LoginScreen() {
  const { requestOtp, login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const colors = Colors.light;

  const handleSendOtp = async () => {
    if (!phone.trim()) { setError('Введите номер'); return; }
    setError('');
    setLoading(true);
    try {
      const dev = await requestOtp(phone.trim());
      setDevOtp(dev);
      if (dev) setOtp(dev);
      setStep('otp');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg.includes('Network') || msg.includes('REFUSED') ? 'Сервер недоступен. Запустите бэкенд (Docker).' : msg || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) { setError('Введите код'); return; }
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim());
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg.includes('Network') || msg.includes('REFUSED') ? 'Сервер недоступен.' : msg || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Super-App</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Вход по номеру телефона</Text>
        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="+998 90 123 45 67"
              accessibilityLabel="Номер телефона"
              nativeID="phone"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Отправить код</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {devOtp != null && (
              <View style={styles.devBox}>
                <Text style={styles.devText}>Код: {devOtp}</Text>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Код из SMS"
              placeholderTextColor={colors.textSecondary}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              accessibilityLabel="Код подтверждения"
              nativeID="otp"
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleVerify} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Войти</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={[styles.backText, { color: colors.primary }]}>Изменить номер</Text>
            </TouchableOpacity>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderRadius: 12, padding: 24 },
  logoBox: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  input: { backgroundColor: '#EEEEEE', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backText: { marginTop: 16, textAlign: 'center', fontSize: 14 },
  error: { color: '#B00020', fontSize: 13, marginTop: 12, textAlign: 'center' },
  devBox: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 16 },
  devText: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },
});
