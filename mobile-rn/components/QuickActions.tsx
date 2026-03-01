import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const ACTIONS = [
  { id: 1, name: 'Скидки', icon: 'percent', lib: 'Feather', color: '#ef4444', bg: '#fee2e2' },
  { id: 2, name: 'Доставка', icon: 'truck', lib: 'FontAwesome5', color: '#10b981', bg: '#d1fae5' },
  { id: 3, name: 'Избранное', icon: 'heart', lib: 'Ionicons', color: '#f59e0b', bg: '#fef3c7' },
  { id: 4, name: 'Поддержка', icon: 'headset', lib: 'MaterialIcons', color: '#3b82f6', bg: '#dbeafe' },
];

export default function QuickActions() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {ACTIONS.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: action.bg }]}>
              {action.lib === 'Feather' && <Ionicons name="pricetag" size={24} color={action.color} />}
              {action.lib === 'FontAwesome5' && <FontAwesome5 name="truck" size={18} color={action.color} />}
              {action.lib === 'Ionicons' && <Ionicons name="heart" size={24} color={action.color} />}
              {action.lib === 'MaterialIcons' && <MaterialIcons name="headset-mic" size={24} color={action.color} />}
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{action.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  actionItem: {
    alignItems: 'center',
    width: 70,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
