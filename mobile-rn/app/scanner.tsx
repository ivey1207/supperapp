import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { scanQr } from '@/lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function QRScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const { token } = useAuth();
    const router = useRouter();
    const colors = Colors.light; // Scanner is usually dark/overlayed, but we use theme colors for UI

    if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <View style={styles.permissionIcon}>
                    <Ionicons name="camera-outline" size={60} color="#fff" />
                </View>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionSubtitle}>We need your permission to scan QR codes on the kiosks.</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
                    <Text style={styles.permissionBtnText}>Grant Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        try {
            const qrData = await scanQr(token!, data);
            // Navigate directly to the branch details with the specific macId
            router.replace({
                pathname: `/branch/${qrData.branchId}`,
                params: { macId: qrData.macId, kioskName: qrData.name }
            } as any);
        } catch (error) {
            alert('Scan Error: Kiosk not found');
            setScanned(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
            />
            <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scan QR Code</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.scanWrapper}>
                    <View style={styles.scanArea}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />

                        {/* Scanning line animation could be added here */}
                        <View style={styles.focusFrame} />
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.hintBox}>
                        <Ionicons name="qr-code-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.hint}>Place the QR code inside the frame</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    permissionContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 40 },
    permissionIcon: { width: 120, height: 120, borderRadius: 40, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
    permissionTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
    permissionSubtitle: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
    permissionBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    permissionBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    overlay: { flex: 1, justifyContent: 'space-between' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    closeBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

    scanWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanArea: { width: width * 0.7, height: width * 0.7, position: 'relative' },
    focusFrame: { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3B82F6', borderWidth: 5 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 24 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 24 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 24 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 24 },

    footer: { paddingBottom: 60, alignItems: 'center' },
    hintBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    hint: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
