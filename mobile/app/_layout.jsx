import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { Colors } from '../lib/colors'
import { SubscriptionProvider } from '../components/SubscriptionContext'
import UpdateChecker from '../components/UpdateChecker'
import { CustomAlertRoot, customAlertRef } from '../components/CustomAlert'


export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        />
        <UpdateChecker />
        <CustomAlertRoot ref={customAlertRef} />
      </View>
    </SubscriptionProvider>
  )
}
