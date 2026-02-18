import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GameFooterProps {
    isMatchScored: boolean;
    onTextMatch: () => void;
    onFinish: () => void;
}

export function GameFooter({ isMatchScored, onTextMatch, onFinish }: GameFooterProps) {
    return (
        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.actionBtn, styles.textBtn]} 
                onPress={onTextMatch}
                activeOpacity={0.8}
            >
                <Text style={styles.btnText}>TEXT MATCH</Text>
            </TouchableOpacity>
            
            {isMatchScored && (
                <TouchableOpacity
                    style={[styles.actionBtn, styles.finishBtn]}
                    onPress={onFinish}
                    activeOpacity={0.8}
                >
                    <Text style={styles.btnText}>FINISH MATCH</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    footer: { 
        flexDirection: 'row', 
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 15, 
        backgroundColor: '#1b3358', 
        position: 'absolute', 
        bottom: 0, 
        width: '100%'
    },
    actionBtn: { 
        flex: 1, 
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 27.5,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3
    },
    textBtn: { backgroundColor: '#445' },
    finishBtn: { backgroundColor: '#87ca37' },
    btnText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }
});
