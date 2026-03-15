import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, SafeAreaView, Platform, Animated, TextInput, KeyboardAvoidingView, ActivityIndicator, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFileUrl, likeUserStory, unlikeUserStory, commentOnUserStory, getStoryComments, formatTimeAgo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function StoryViewScreen() {
    const { stories: storiesJson, initialIndex } = useLocalSearchParams();
    const router = useRouter();
    const stories = JSON.parse(storiesJson as string || '[]');
    const [currentIndex, setCurrentIndex] = useState(parseInt(initialIndex as string || '0'));
    const [progress] = useState(new Animated.Value(0));
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState('');
    const { token } = useAuth();
    const videoRef = useRef<Video>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const insets = useSafeAreaInsets();
    const [comments, setComments] = useState<any[]>([]);
    const [isCommentsVisible, setIsCommentsVisible] = useState(false);

    const [localStories, setLocalStories] = useState(stories);
    const activeStory = localStories[currentIndex];

    // Check if current story is a video
    const isVideo = (url?: string) => {
        if (!url) return false;
        const ext = url.split('.').pop()?.toLowerCase();
        return ['mp4', 'm4v', 'mov', 'avi'].includes(ext || '');
    };

    const storyUrl = getFileUrl(activeStory.imageUrl) || activeStory.image || '';
    const activeIsVideo = isVideo(storyUrl);

    const startProgress = (duration: number = 5000) => {
        progress.setValue(0);
        if (isPaused) return;

        Animated.timing(progress, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && !isPaused) {
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
        if (!token || !activeStory) return;

        const isLiked = activeStory.isLiked;
        const newIsLiked = !isLiked;
        const newLikeCount = (activeStory.likeCount || 0) + (newIsLiked ? 1 : -1);

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
        }
    };

    const loadComments = async (storyId: string) => {
        if (!token) return;
        try {
            const data = await getStoryComments(token, storyId);
            setComments(data);
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !token) return;
        try {
            await commentOnUserStory(token, activeStory.id, replyText);
            setReplyText('');
            loadComments(activeStory.id);
            Keyboard.dismiss();
            setIsCommentsVisible(true);
        } catch (error) {
            console.error('Failed to send reply', error);
            alert('Failed to send reply');
        }
    };

    useEffect(() => {
        if (activeStory) {
            loadComments(activeStory.id);
        }
    }, [currentIndex]);

    useEffect(() => {
        if (!activeIsVideo) {
            startProgress(5000);
        }
    }, [currentIndex, isPaused, activeIsVideo]);

    if (!activeStory) return null;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <TouchableOpacity
                activeOpacity={1}
                onLongPress={() => {
                    setIsPaused(true);
                    progress.stopAnimation();
                }}
                onPressOut={() => {
                    if (isPaused) {
                        setIsPaused(false);
                    }
                }}
                style={styles.storyContainer}
            >
                {activeIsVideo ? (
                    <View style={styles.storyImage}>
                        <Video
                            ref={videoRef}
                            source={{ uri: storyUrl }}
                            style={styles.storyImage}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={!isPaused}
                            isLooping={false}
                            onLoadStart={() => setIsVideoLoading(true)}
                            onLoad={(data: any) => {
                                setIsVideoLoading(false);
                                startProgress(data.durationMillis || 5000);
                            }}
                            onError={(err) => {
                                console.error('Video error:', err);
                                nextStory();
                            }}
                        />
                        {isVideoLoading && (
                            <ActivityIndicator size="large" color="#fff" style={StyleSheet.absoluteFill} />
                        )}
                    </View>
                ) : (
                    <Image
                        source={{ uri: storyUrl }}
                        style={styles.storyImage}
                    />
                )}

                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.4)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Tap areas for navigation */}
                <View style={styles.tapContainer}>
                    <TouchableOpacity style={styles.tapArea} onPress={prevStory} />
                    <TouchableOpacity style={styles.tapArea} onPress={nextStory} />
                </View>

                <SafeAreaView style={[styles.overlay, { paddingTop: insets.top }]}>
                    {/* Progress Indicators - IG Style */}
                    <View style={styles.progressContainer}>
                        {localStories.map((_: any, index: number) => (
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

                    {/* Header Information - IG Style */}
                    <View style={styles.header}>
                        <View style={styles.userRow}>
                            <View style={styles.avatarPlaceholder}>
                                <Image
                                    source={{ uri: getFileUrl(activeStory.userAvatarUrl) || `https://ui-avatars.com/api/?name=${activeStory.displayName || activeStory.userName || 'U'}&background=3b82f6&color=fff` }}
                                    style={styles.avatarImage}
                                />
                            </View>
                            <View style={styles.headerTextCol}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.userName}>{activeStory.displayName || activeStory.userName || 'SuperApp User'}</Text>
                                    <Text style={styles.timeLabel}>{formatTimeAgo(activeStory.createdAt)}</Text>
                                </View>
                                {activeStory.type === 'PROMO' && (
                                    <Text style={styles.subLabel}>Sponsored</Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Footer Bottom Actions */}
                <View style={[styles.footer, { bottom: insets.bottom + 15 }]}>
                    <View style={styles.replyBar}>
                        <TextInput
                            style={styles.replyInput}
                            placeholder="Send Message"
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            value={replyText}
                            onChangeText={setReplyText}
                            onFocus={() => {
                                setIsPaused(true);
                                progress.stopAnimation();
                            }}
                            onSubmitEditing={handleSendReply}
                        />
                        <TouchableOpacity onPress={handleSendReply} style={styles.sendIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.actionIconBtn} 
                        onPress={() => setIsCommentsVisible(!isCommentsVisible)}
                    >
                        <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                        {comments.length > 0 && <Text style={styles.badge}>{comments.length}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.heartBtn}
                        onPress={onLikeToggle}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        activeOpacity={0.7}
                    >
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

                {/* Comments Overlay */}
                {isCommentsVisible && (
                    <TouchableOpacity 
                        style={styles.commentsOverlay} 
                        activeOpacity={1} 
                        onPress={() => setIsCommentsVisible(false)}
                    >
                        <View style={[styles.commentsContent, { paddingBottom: insets.bottom + 10 }]}>
                            <View style={styles.commentsHeader}>
                                <Text style={styles.commentsTitle}>Comments</Text>
                                <TouchableOpacity onPress={() => setIsCommentsVisible(false)}>
                                    <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.commentsList}>
                                {comments.length === 0 ? (
                                    <Text style={styles.noComments}>No comments yet</Text>
                                ) : (
                                    comments.map((c, i) => (
                                        <View key={i} style={styles.commentItem}>
                                            <Text style={styles.commentUser}>{c.userName}</Text>
                                            <Text style={styles.commentText}>{c.content}</Text>
                                            <Text style={styles.commentDate}>{formatTimeAgo(c.createdAt)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    storyContainer: { flex: 1 },
    storyImage: { width: width, height: height, resizeMode: 'cover' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    tapContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 100, flexDirection: 'row' },
    tapArea: { flex: 1 },
    progressContainer: { flexDirection: 'row', paddingHorizontal: 10, gap: 4, height: 3, marginTop: 15 },
    progressBarBackground: { flex: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
    progressBarValue: { height: '100%', backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginTop: 15 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    headerTextCol: { justifyContent: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    userName: { color: '#fff', fontSize: 14, fontWeight: '700' },
    timeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
    subLabel: { color: '#fff', fontSize: 11, fontWeight: '400', marginTop: -2 },
    closeBtn: { padding: 8 },
    footer: { position: 'absolute', bottom: 0, left: 15, right: 15, flexDirection: 'row', alignItems: 'center', gap: 15 },
    replyBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 16,
    },
    replyInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        height: '100%',
    },
    sendIcon: {
        marginLeft: 8,
    },
    heartBtn: { height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    likeCountText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    actionIconBtn: { padding: 4, position: 'relative' },
    badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', color: '#fff', fontSize: 10, paddingHorizontal: 4, borderRadius: 8, overflow: 'hidden', fontWeight: 'bold' },
    
    commentsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    commentsContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.6, padding: 20 },
    commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    commentsTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    commentsList: { gap: 15 },
    noComments: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginVertical: 20 },
    commentItem: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10 },
    commentUser: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
    commentText: { color: '#fff', fontSize: 15 },
    commentDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }
});
