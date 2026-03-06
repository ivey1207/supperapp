import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, useColorScheme, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, updateProfile, getFileUrl, uploadImage } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export default function ProfileEditScreen() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const { token } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [carModel, setCarModel] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [buster, setBuster] = useState(Date.now());

    const { data: user, isLoading } = useQuery({
        queryKey: ['me', token],
        queryFn: () => getMe(token!),
        enabled: !!token,
    });

    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setCarModel(user.carModel || '');
            setAvatarUrl(user.avatarUrl || null);
        }
    }, [user]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            try {
                const { url } = await uploadImage(token!, result.assets[0].uri);
                setAvatarUrl(url);
                setBuster(Date.now());
            } catch (error) {
                console.error('Failed to upload avatar:', error);
                Alert.alert('Error', 'Failed to upload image');
            }
        }
    };

    const updateMutation = useMutation({
        mutationFn: (data: { fullName: string; carModel: string; avatarUrl?: string | null }) => updateProfile(token!, { ...data, avatarUrl: data.avatarUrl ?? undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
        },
        onError: () => {
            Alert.alert('Error', 'Failed to update profile');
        }
    });

    const handleSave = async () => {
        if (!fullName.trim()) return Alert.alert('Error', 'Name cannot be empty');
        try {
            await updateMutation.mutateAsync({ fullName, carModel, avatarUrl });
        } catch (e) {
            console.error('Save failed:', e);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.avatarSection}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 4, overflow: 'hidden' }]}>
                            {avatarUrl ? (
                                <Image
                                    source={{ uri: `${getFileUrl(avatarUrl)}${getFileUrl(avatarUrl)?.includes('?') ? '&' : '?'}t=${buster}` }}
                                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                                />
                            ) : (
                                <Ionicons name="person" size={60} color={colors.primary} />
                            )}
                            <TouchableOpacity
                                style={[styles.editAvatarBtn, { backgroundColor: colors.primary }]}
                                onPress={pickImage}
                            >
                                <Ionicons name="camera" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>Change Profile Picture</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholderTextColor="#94A3B8"
                                    placeholder="Enter your name"
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Car Model</Text>
                            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="car-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={carModel}
                                    onChangeText={setCarModel}
                                    placeholderTextColor="#94A3B8"
                                    placeholder="e.g. Chevrolet Malibu"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: updateMutation.isPending ? 0.7 : 1 }]}
                            onPress={handleSave}
                            disabled={updateMutation.isPending}
                            activeOpacity={0.8}
                        >
                            {updateMutation.isPending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { paddingBottom: 40 },

    avatarSection: { alignItems: 'center', marginVertical: 32 },
    avatarPlaceholder: { width: 120, height: 120, borderRadius: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    editAvatarBtn: { position: 'absolute', bottom: -4, right: -4, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
    avatarHint: { fontSize: 13, fontWeight: '600', marginTop: 12 },

    formContainer: { paddingHorizontal: 24, gap: 24 },
    inputWrapper: { gap: 8 },
    label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, height: 60, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },

    saveButton: { width: '100%', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

