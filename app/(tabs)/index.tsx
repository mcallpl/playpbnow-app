import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function SplashScreen() {
  const router = useRouter();

  const handleEnter = () => {
    // We use 'replace' so the user can't swipe back to the splash screen
    router.replace('/groups');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.contentContainer}>
        {/* LOGO */}
        <Image
          source={{ uri: 'https://peoplestar.com/Chipleball/images/PlayPBNow_Logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* ENTER BUTTON */}
        <TouchableOpacity 
          style={styles.enterBtn} 
          onPress={handleEnter}
          activeOpacity={0.8}
        >
          <Text style={styles.enterText}>ENTER APP</Text>
        </TouchableOpacity>
      </View>
      
      {/* FOOTER TEXT */}
      <Text style={styles.footerText}>POWERED BY PEOPLESTAR</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b3358', // Your App's Blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40, // Space between Logo and Button
  },
  logo: {
    width: 300,
    height: 300,
  },
  enterBtn: {
    backgroundColor: '#87ca37', // Your App's Green
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8, // Shadow for Android
  },
  enterText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    color: 'white',
    opacity: 0.3,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});