import { useAudioPlayer } from 'expo-audio';

// Static references for imperative playback
let beaconPlayer: ReturnType<typeof useAudioPlayer> | null = null;
let chatPlayer: ReturnType<typeof useAudioPlayer> | null = null;

// expo-audio requires hook-based players. We use a component to create them
// and expose imperative play functions via module-level refs.
// This file exports a hook that must be called once in a top-level component.

export function useSoundPlayers() {
  const beacon = useAudioPlayer(require('../assets/sounds/beacon-chime.wav'));
  const chat = useAudioPlayer(require('../assets/sounds/chat-ping.wav'));

  beaconPlayer = beacon;
  chatPlayer = chat;
}

export async function playBeaconChime() {
  try {
    if (beaconPlayer) {
      beaconPlayer.seekTo(0);
      beaconPlayer.play();
    }
  } catch {
    // Silently fail — sound is not critical
  }
}

export async function playChatPing() {
  try {
    if (chatPlayer) {
      chatPlayer.seekTo(0);
      chatPlayer.play();
    }
  } catch {
    // Silently fail — sound is not critical
  }
}
