import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, SafeAreaView, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFileUrl, likeUserStory, unlikeUserStory } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const { width, height } = Dimensions.get('window');

export default function StoryViewScreen() {
    const { stories: storiesJson, initialIndex } = useLocalSearchParams();
    const router = useRouter();
    const stories = JSON.parse(storiesJson as string || '[]');
    const [currentIndex, setCurrentIndex] = useState(parseInt(initialIndex as string || '0'));
    const [progress] = useState(new Animated.Value(0));
    const timer = useRef<NodeJS.Timeout | null>(null);
    const { token } = useAuth();

    const [localStories, setLocalStories] = useState(stories);
    const activeStory = localStories[currentIndex];

    const startProgress = () => {
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                nextStory();
            }
        });
    };

    const nextStory = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            router.back();
        }
    };

    const prevStory = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            router.back();
        }
    };

    const onLikeToggle = async () => {
        if (!token || !activeStory || activeStory.type !== 'USER') return;

        const isLiked = activeStory.isLiked;
        const newIsLiked = !isLiked;
        const newLikeCount = (activeStory.likeCount || 0) + (newIsLiked ? 1 : -1);

        // Optimistic update
        const updatedStories = [...localStories];
        updatedStories[currentIndex] = {
            ...activeStory,
            isLiked: newIsLiked,
            likeCount: Math.max(0, newLikeCount)
        };
        setLocalStories(updatedStories);

        try {
            if (newIsLiked) {
                await likeUserStory(token, activeStory.id);
            } else {
                await unlikeUserStory(token, activeStory.id);
            }
        } catch (err) {
            console.error('Failed to toggle like:', err);
            // Rollback if needed (for simplicity, we skip rollback here unless it's a critical UX issue)
        }
    };

    useEffect(() => {
        startProgress();
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [currentIndex]);

    if (!activeStory) return null;

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: getFileUrl(activeStory.imageUrl) || activeStory.image || '' }}
                style={styles.storyImage}
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.4)']}
                style={StyleSheet.absoluteFill}
            />

            {/* Tap areas for navigation */}
            <View style={styles.tapContainer}>
                <TouchableOpacity style={styles.tapArea} onPress={prevStory} />
                <TouchableOpacity style={styles.tapArea} onPress={nextStory} />
            </View>

            <SafeAreaView style={styles.overlay}>
                {/* Progress Indicators */}
                <View style={styles.progressContainer}>
                    {stories.map((_: any, index: number) => (
                        <View key={index} style={styles.progressBarBackground}>
                            <Animated.View
                                style={[
                                    styles.progressBarValue,
                                    {
                                        width: index === currentIndex
                                            ? progress.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%']
                                            })
                                            : index < currentIndex ? '100%' : '0%'
                                    }
                                ]}
                            />
                        </View>
                    ))}
                </View>

                {/* Header Information */}
                <View style={styles.header}>
                    <View style={styles.userRow}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{activeStory.displayName?.charAt(0) || activeStory.userName?.charAt(0) || 'U'}</Text>
                        </View>
                        <View>
                            <Text style={styles.userName}>{activeStory.displayName || activeStory.userName || 'SuperApp User'}</Text>
                            <Text style={styles.timeLabel}>Active now</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Footer Bottom Actions (Optional) */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.replyBtn} onPress={() => { }}>
                    <Text style={styles.replyBtnText}>Send Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heartBtn} onPress={onLikeToggle}>
                    <Ionicons
                        name={activeStory.isLiked ? "heart" : "heart-outline"}
                        size={28}
                        color={activeStory.isLiked ? "#ef4444" : "#fff"}
                    />
                    {activeStory.likeCount > 0 && (
                        <Text style={styles.likeCountText}>{activeStory.likeCount}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    storyImage: { width: width, height: height, resizeMode: 'cover' },
    overlay: { position: 'absolute', top: Platform.OS === 'android' ? 20 : 0, left: 0, right: 0 },
    tapContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
    tapArea: { flex: 1 },
    progressContainer: { flexDirection: 'row', paddingHorizontal: 10, gap: 4, height: 3, marginTop: 10 },
    progressBarBackground: { flex: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
    progressBarValue: { height: '100%', backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    userName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    timeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    closeBtn: { padding: 4 },
    footer: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    replyBtn: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
    replyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    heartBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    likeCountText: { color: '#fff', fontSize: 14, fontWeight: '700' }
});
