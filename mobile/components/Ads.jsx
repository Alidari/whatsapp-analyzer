import React, { useEffect, useState } from 'react'
import { Platform, View, Text } from 'react-native'
import { BannerAd, BannerAdSize, TestIds, InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads'

// Use test IDs for development
const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyy'
const interstitialId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyy'
const rewardedId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyy'

// ── BANNER AD ──
export function AppBannerAd() {
  if (Platform.OS === 'web') return null; // Ads not supported on web via this package
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
      {/* Banner will load securely here */}
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  )
}

// ── INTERSTITIAL AD (Geçiş) ──
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
        interstitialAd.load() // Load next
        resolve(true)
      })
      interstitialAd.show()
    } else {
      resolve(false) // Didn't load in time, ignore
    }
  })
}

// ── REWARDED AD (Ödüllü) ──
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
      resolve(true); // Always reward on web for now
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
        rewardedAd.load() // Preload next
        if (rewarded) {
          resolve(true)
        } else {
          reject(new Error('Reklam tamamlanmadan kapatıldı.'))
        }
      })
      
      rewardedAd.show()
    } else {
      reject(new Error('Reklam henüz yüklenmedi, lütfen bekleyip tekrar deneyin.'))
    }
  })
}
