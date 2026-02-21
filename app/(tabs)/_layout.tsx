import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useActiveMatch } from '../../context/ActiveMatchContext';
import { useTheme } from '../../context/ThemeContext';
import { FONT_DISPLAY_BOLD } from '../../constants/theme';

export default function TabLayout() {
  const { activeMatch } = useActiveMatch();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: FONT_DISPLAY_BOLD,
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'GROUPS',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="setup"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'PLAYERS',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="live"
        options={activeMatch ? {
          title: 'LIVE',
          tabBarIcon: ({ color }) => (
            <Ionicons name="radio" size={24} color={color} />
          ),
          tabBarLabelStyle: {
            fontFamily: FONT_DISPLAY_BOLD,
            fontSize: 10,
            color: colors.accent,
          },
        } : {
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'RANKINGS',
          tabBarIcon: ({ color }) => (
            <Ionicons name="trophy" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
