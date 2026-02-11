import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusModalProps {
    visible: boolean;
    onClose: () => void;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
}

export default function StatusModal({ visible, onClose, type, title, message }: StatusModalProps) {
    React.useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Auto-close after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'info': return 'information-circle';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return '#0B4D26';
            case 'error': return '#DC2626';
            case 'info': return '#3B82F6';
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.contentContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: getColor() + '20' }]}>
                            <Ionicons name={getIcon()} size={40} color={getColor()} />
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: getColor() }]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly darker for better focus
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 0, // Remove container padding
        width: '90%', // Fits the page better
        maxWidth: 360,
        alignItems: 'center',
        overflow: 'hidden', // Ensure children don't leak out of rounded corners
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    contentContainer: {
        padding: 30, // Move padding here for internal elements
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
