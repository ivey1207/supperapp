import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const ACTIONS = [
  { id: 1, name: 'Offers', icon: 'percent', lib: 'Feather', color: '#EF4444' },
  { id: 2, name: 'Delivery', icon: 'truck', lib: 'FontAwesome5', color: '#10B981' },
  { id: 3, name: 'Favorites', icon: 'heart', lib: 'Ionicons', color: '#F59E0B' },
  { id: 4, name: 'Support', icon: 'headset', lib: 'MaterialIcons', color: '#3B82F6' },
];

export default function QuickActions() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {ACTIONS.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
              {action.lib === 'Feather' && <Ionicons name="pricetag" size={24} color={action.color} />}
              {action.lib === 'FontAwesome5' && <FontAwesome5 name="truck" size={20} color={action.color} />}
              {action.lib === 'Ionicons' && <Ionicons name="heart" size={24} color={action.color} />}
              {action.lib === 'MaterialIcons' && <MaterialIcons name="headset-mic" size={24} color={action.color} />}
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  actionItem: {
    alignItems: 'center',
    width: 76,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
