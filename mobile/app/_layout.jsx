import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Colors } from '../lib/colors'
import { SubscriptionProvider } from '../components/SubscriptionContext'

export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      />
    </SubscriptionProvider>
  )
}
