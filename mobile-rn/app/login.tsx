import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { requestOtp, login, loginWithPassword } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const handleSendOtp = async () => {
    if (!phone.trim()) { setError('Enter your phone number'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email'); return; }
    setError('');
    setLoading(true);
    try {
      await requestOtp(phone.trim(), email.trim());
      setStep('otp');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg.includes('Network') || msg.includes('REFUSED') ? 'Server unavailable. Please check connection.' : msg || 'Error sending code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) { setError('Enter the code'); return; }
    setError('');
    setLoading(true);
    try {
      const { isNewUser } = await login(phone.trim(), otp.trim());
      if (isNewUser) {
        router.push('/register' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg.includes('Network') || msg.includes('REFUSED') ? 'Server unavailable.' : msg || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    const identifier = email || phone;
    if (!identifier.trim()) { setError('Enter your email or phone number'); return; }
    if (!password.trim()) { setError('Enter your password'); return; }
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(identifier.trim(), password.trim());
      router.replace('/(tabs)' as any);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg || 'Invalid credentials');
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
              <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {loginMode === 'password'
                  ? 'Login with phone/email and password'
                  : step === 'phone' ? 'Registration: Enter details to get code' : 'Enter the code sent to your email'}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {loginMode === 'password' ? (
                <View style={styles.form}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Email or Phone</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="email@example.com or +998..."
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>

                  <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePasswordLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 12 }}>
                    <TouchableOpacity onPress={() => setLoginMode('otp')}>
                      <Text style={[styles.toggleText, { color: colors.primary, fontWeight: '700' }]}>Sign Up</Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.textSecondary }}>|</Text>
                    <TouchableOpacity onPress={() => router.push('/forgot-password' as any)}>
                      <Text style={[styles.toggleText, { color: colors.textSecondary }]}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : step === 'phone' ? (
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
                      editable={!loading}
                    />
                  </View>

                  <Text style={[styles.label, { color: colors.textSecondary }]}>Email (for OTP)</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="your@email.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.btnText}>Send Code</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setLoginMode('password')} style={styles.toggleLink}>
                    <Text style={[styles.toggleText, { color: colors.primary, fontWeight: '700' }]}>Login with Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push('/register' as any)} style={styles.toggleLink}>
                    <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                      New here? <Text style={{ color: colors.primary, fontWeight: '800' }}>Create account</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.form}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Code</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 24 }]}>
                    <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#94A3B8"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                    onPress={handleVerify}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Proceed</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setStep('phone')} style={styles.toggleLink}>
                    <Text style={[styles.toggleText, { color: colors.primary, fontWeight: '700' }]}>Change phone number</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push('/forgot-password' as any)} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Forgot password?</Text>
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
