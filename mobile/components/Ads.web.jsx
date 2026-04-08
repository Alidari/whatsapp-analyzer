// Mock Ads implementation for Web since react-native-google-mobile-ads does not support the web bundler
import React from 'react';

export function AppBannerAd() {
  return null;
}

export function loadInterstitial() {
  // Web üzerinde reklam yok, hiç bir şey yapma
}

export function showInterstitialAsync() {
  return Promise.resolve(true); // Web kullancısı her zaman geçer
}

export function loadRewarded() {
  // Web üzerinde reklam yok
}

export function showRewardedAsync() {
  return Promise.resolve(true); // Web kullanıcısı reklamsız olarak ödülü anında kazanır
}
