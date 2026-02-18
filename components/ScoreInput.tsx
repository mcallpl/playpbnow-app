import React from 'react';
import { StyleSheet, TextInput } from 'react-native';

interface ScoreInputProps {
    value: string;
    onChangeText: (text: string) => void;
    inputRef?: (ref: TextInput | null) => void;
    returnKeyType?: 'next' | 'done';
}

export function ScoreInput({ value, onChangeText, inputRef, returnKeyType = 'next' }: ScoreInputProps) {
    return (
        <TextInput
            ref={inputRef}
            style={styles.scoreInput}
            keyboardType="numeric"
            placeholder="-"
            placeholderTextColor="#ccc"
            value={value}
            onChangeText={onChangeText}
            returnKeyType={returnKeyType}
            maxLength={2}
            selectTextOnFocus
        />
    );
}

const styles = StyleSheet.create({
    scoreInput: {
        backgroundColor: '#fff',
        width: 45,
        height: 45,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '900',
        color: '#1b3358',
        borderWidth: 2,
        borderColor: '#e0e0e0'
    }
});
