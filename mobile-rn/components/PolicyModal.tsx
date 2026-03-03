import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface PolicyModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PolicyModal({ visible, onClose }: PolicyModalProps) {
    const colors = Colors.dark;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Политика конфиденциальности</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={[styles.text, { color: colors.textSecondary }]}>
                        Последнее обновление: 2 марта 2026 г.{"\n\n"}
                        Приветствуем в нашем Супер-приложении! Ваша конфиденциальность очень важна для нас.{"\n\n"}
                        1. Сбор данных: Мы собираем ваше имя, номер телефона и данные об автомобиле для предоставления качественных услуг автосервиса и мойки.{"\n\n"}
                        2. Геопозиция: Приложение запрашивает доступ к вашей геопозиции для отображения ближайших филиалов и построения маршрутов. Данные о местоположении не передаются третьим лицам.{"\n\n"}
                        3. Безопасность: Мы используем современные методы шифрования для защиты ваших данных.{"\n\n"}
                        4. Согласие: Продолжая регистрацию, вы соглашаетесь с обработкой ваших персональных данных в соответствии с законодательством Республики Узбекистан.{"\n\n"}
                        5. Контакты: По всем вопросам вы можете обратиться в нашу службу поддержки через раздел "Помощь" в приложении.
                    </Text>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={styles.buttonText}>Понятно</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: { fontSize: 18, fontWeight: '800' },
    closeBtn: { padding: 4 },
    content: { padding: 20 },
    text: { fontSize: 15, lineHeight: 24 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    button: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
