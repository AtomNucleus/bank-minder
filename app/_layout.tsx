import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor:
              colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          },
          headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor:
              colorScheme === 'dark' ? '#121212' : '#f5f5f5',
          },
          animationEnabled: true,
        }}
      >
        {/* Home Screen */}
        <Stack.Screen
          name="index"
          options={{
            title: 'Bank Minder',
            headerShown: true,
            headerLargeTitle: true,
          }}
        />

        {/* Authentication Screens */}
        <Stack.Group
          screenOptions={{
            headerShown: true,
            presentation: 'card',
          }}
        >
          <Stack.Screen
            name="(auth)/login"
            options={{
              title: 'Login',
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="(auth)/register"
            options={{
              title: 'Create Account',
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="(auth)/forgot-password"
            options={{
              title: 'Reset Password',
              headerBackVisible: true,
            }}
          />
        </Stack.Group>

        {/* Main App Screens */}
        <Stack.Group
          screenOptions={{
            presentation: 'card',
            headerShown: true,
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="account-details"
            options={{
              title: 'Account Details',
              headerBackVisible: true,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="transaction-details"
            options={{
              title: 'Transaction Details',
              headerBackVisible: true,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="add-account"
            options={{
              title: 'Add Account',
              headerBackVisible: true,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              title: 'Profile',
              headerBackVisible: true,
            }}
          />
        </Stack.Group>

        {/* Not Found Screen */}
        <Stack.Screen
          name="+not-found"
          options={{
            title: 'Oops!',
            headerShown: true,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
