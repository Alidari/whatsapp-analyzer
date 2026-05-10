import React, { useEffect, useState } from 'react'
import { Platform, View, Text } from 'react-native'
import mobileAds, { BannerAd, BannerAdSize, TestIds, InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads'

import { useSubscription } from './SubscriptionContext'

// SDK Başlatma
mobileAds()
  .initialize()
  .then(adapterStatuses => {
    // Initialization complete!
    console.log('AdMob Initialized');
  });

// Use test IDs for development OR if we want to test APK with test ads
// Buradaki 'false' değerini APK'da gerçek reklam görmek istiyorsan elle true yapabilirsin
const FORCE_TEST_ADS = true; 

const isTestMode = __DEV__ || FORCE_TEST_ADS;

const adUnitId = isTestMode ? TestIds.BANNER : 'ca-app-pub-1645648125009801/1821778350'
const interstitialId = isTestMode ? TestIds.INTERSTITIAL : TestIds.INTERSTITIAL // Gerçek ID gelene kadar test kalsın
const rewardedId = isTestMode ? TestIds.REWARDED : 'ca-app-pub-1645648125009801/4265989191'

import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../lib/colors'

// ── BANNER AD ──
export function AppBannerAd() {
  const { isSubscribed } = useSubscription()
  const insets = useSafeAreaInsets()
  
  if (Platform.OS === 'web' || isSubscribed) return null; 
  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: insets.bottom + (Platform.OS === 'android' ? 10 : 0),
      backgroundColor: Colors.background,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
    }}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner Ad Failed: ', error);
        }}
      />
    </View>
  )
}

// ── INTERSTITIAL AD ──
let interstitialAd = InterstitialAd.createForAdRequest(interstitialId, {
  requestNonPersonalizedAdsOnly: true,
})

export function loadInterstitial() {
  if (Platform.OS === 'web') return;
  interstitialAd.load()
}

export function showInterstitialAsync() {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(true);
      return;
    }
    
    if (interstitialAd.loaded) {
      const unsubscribeClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        unsubscribeClosed()
        interstitialAd.load()
        resolve(true)
      })
      interstitialAd.show()
    } else {
      console.log('Interstitial not loaded');
      resolve(false) 
    }
  })
}

// ── REWARDED AD ──
let rewardedAd = RewardedAd.createForAdRequest(rewardedId, {
  requestNonPersonalizedAdsOnly: true,
})

export function loadRewarded() {
  if (Platform.OS === 'web') return;
  rewardedAd.load()
}

export function showRewardedAsync() {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      resolve(true);
      return;
    }

    if (rewardedAd.loaded) {
      let rewarded = false

      const unsubscribeEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
        rewarded = true
      })
      
      const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        unsubscribeEarned()
        unsubscribeClosed()
        rewardedAd.load() 
        if (rewarded) {
          resolve(true)
        } else {
          reject(new Error('Reklam tamamlanmadan kapatıldı. Ödül kazanmak için sonuna kadar izlemelisiniz.'))
        }
      })
      
      rewardedAd.show()
    } else {
      // Eğer yüklenmediyse tekrar denemesini isteyelim ve yüklemeyi tetikleyelim
      rewardedAd.load();
      reject(new Error('Reklam henüz hazır değil. Lütfen birkaç saniye bekleyip tekrar deneyin. (İnternet bağlantınızı kontrol edin)'))
    }
  })
}
