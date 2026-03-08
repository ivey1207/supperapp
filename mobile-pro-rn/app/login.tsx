import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import '@/lib/i18n';

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const handleLogin = async () => {
    const identifier = email;
    if (!identifier.trim()) { setError(t('auth.emailOrPhone')); return; }
    if (!password.trim()) { setError(t('auth.password')); return; }
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(identifier.trim(), password.trim());
      router.replace('/(tabs)' as any);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg.includes('Network') || msg.includes('REFUSED') || msg.includes('timeout') ? 'Server unavailable. Please check connection.' : msg || 'Invalid credentials');
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.introSection}>
              <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="car-sport" size={40} color="#fff" />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('auth.loginSubtitle')}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.emailOrPhone')}</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="email@example.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

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
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('welcome.login')}</Text>}
                </TouchableOpacity>
              </View>
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
  logoContainer: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  title: { fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  card: { borderRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 10 },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, marginBottom: 20, height: 60 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '700' },
  mainBtn: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, marginTop: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  toggleLink: { marginTop: 24, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 14, marginTop: 20, textAlign: 'center', fontWeight: '700' },
  devTag: { backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  devText: { color: '#16A34A', fontSize: 14, fontWeight: '800', textAlign: 'center' },
});
