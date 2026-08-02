import { Tabs } from 'expo-router';
import React from 'react';
import { BrandedIcon } from '../../components/BrandedIcon';
import { PulsingTabIcon } from '../../components/PulsingTabIcon';
import { useActiveMatch } from '../../context/ActiveMatchContext';
import { useBeaconStatus } from '../../context/BeaconContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../context/ThemeContext';
import { FONT_DISPLAY_BOLD } from '../../constants/theme';

export default function TabLayout() {
  const { activeMatch } = useActiveMatch();
  const { hasOtherBeacons, hasOwnBeacon, otherBeaconCount } = useBeaconStatus();
  const { isAdmin } = useSubscription();
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
            <BrandedIcon name="groups" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="playnow"
        options={{
          title: 'PLAY NOW',
          tabBarLabel: hasOwnBeacon && !hasOtherBeacons ? 'PLAY NOW' : undefined,
          tabBarLabelStyle: hasOwnBeacon && !hasOtherBeacons ? { color: '#cc0000' } : undefined,
          tabBarIcon: ({ color }) => (
            <PulsingTabIcon
              name="playnow"
              size={24}
              color={hasOwnBeacon && !hasOtherBeacons ? '#cc0000' : color}
              active={hasOtherBeacons}
              glowColor={colors.accent}
              count={otherBeaconCount}
            />
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
            <BrandedIcon name="live" size={24} color={color} />
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
      {/* INVITES hidden pending the rebuild as anonymous criteria "requests".
          The screen and every endpoint, table and RSVP page behind it are kept
          intact — the request/claim model reuses match_invites, invite_responses
          and invite.html. Hiding, not deleting, so this is a one-line reversal.
          Two reasons it comes out now rather than later: the player picker
          exposed a browsable directory of 528 real pool members to any paying
          user, and the admin iMessage path reported "Invites Sent" for messages
          that were never delivered. */}
      <Tabs.Screen
        name="invites"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'RANKINGS',
          tabBarIcon: ({ color }) => (
            <BrandedIcon name="leaderboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={isAdmin ? {
          title: 'ADMIN',
          tabBarIcon: ({ color }) => (
            <BrandedIcon name="settings" size={24} color={color} />
          ),
        } : {
          href: null,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: 'HELP',
          tabBarIcon: ({ color }) => (
            <BrandedIcon name="info" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
