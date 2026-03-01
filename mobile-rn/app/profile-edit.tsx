import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, updateProfile } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileEditScreen() {
    const scheme = useColorScheme() ?? 'dark';
    const colors = Colors[scheme];
    const { token } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [carModel, setCarModel] = useState('');

    const { data: user } = useQuery({
        queryKey: ['me', token],
        queryFn: () => getMe(token!),
        enabled: !!token,
    });

    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setCarModel(user.carModel || '');
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: (data: { fullName: string; carModel: string }) => updateProfile(token!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            Alert.alert('Успех', 'Профиль успешно обновлен', [{ text: 'OK', onPress: () => router.back() }]);
        },
        onError: () => {
            Alert.alert('Ошибка', 'Не удалось обновить профиль');
        }
    });

    const handleSave = () => {
        if (!fullName.trim()) return Alert.alert('Ошибка', 'Имя не может быть пустым');
        updateMutation.mutate({ fullName, carModel });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Редактирование профиля</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Имя и Фамилия</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholderTextColor={colors.textSecondary}
                        placeholder="Введите ваше имя"
                    />
                </View>

                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 24 }]}>Модель автомобиля</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="car-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={carModel}
                        onChangeText={setCarModel}
                        placeholderTextColor={colors.textSecondary}
                        placeholder="Например: Chevrolet Malibu"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary, opacity: updateMutation.isPending ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={updateMutation.isPending}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>{updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}</Text>
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
    content: { padding: 24 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '500' },
    saveButton: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 40, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
