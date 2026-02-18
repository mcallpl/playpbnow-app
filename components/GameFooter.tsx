import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GameFooterProps {
    allScoresComplete: boolean;
    shareCode: string;
    onTextMatch: () => void;
    onFinishMatch: () => void;
    onInviteCollaborators: () => void;
    finishButtonRef?: React.RefObject<any>;
}

export function GameFooter({
    allScoresComplete,
    shareCode,
    onTextMatch,
    onFinishMatch,
    onInviteCollaborators,
    finishButtonRef
}: GameFooterProps) {
    // Show share button before scoring complete
    if (!allScoresComplete && shareCode) {
        return (
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.shareBtn]}
                    onPress={onInviteCollaborators}
                    activeOpacity={0.8}
                >
                    <Ionicons name="share-social" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>INVITE COLLABORATORS</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Show text/finish buttons after scoring complete
    if (allScoresComplete) {
        return (
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.textBtn]}
                    onPress={onTextMatch}
                    activeOpacity={0.8}
                >
                    <Text style={styles.btnText}>TEXT MATCH</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    ref={finishButtonRef}
                    style={[styles.actionBtn, styles.finishBtn]}
                    onPress={onFinishMatch}
                    activeOpacity={0.8}
                >
                    <Text style={styles.btnText}>FINISH MATCH</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 10,
        padding: 15,
        paddingBottom: 25,
        backgroundColor: '#1b3358',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)'
    },
    actionBtn: {
        flex: 1,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 27.5
    },
    textBtn: {
        backgroundColor: '#445'
    },
    shareBtn: {
        backgroundColor: '#3498db',
        flexDirection: 'row'
    },
    finishBtn: {
        backgroundColor: '#87ca37'
    },
    btnText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 0.5
    }
});
