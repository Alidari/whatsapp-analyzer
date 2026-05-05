import { Platform } from 'react-native';
import { getSubscriptionStatus, verifySubscription } from './api';

// Lazy IAP loader — defers native module access until first use,
// preventing the NitroModules crash at app startup on unconfigured dev clients.
let _IAP = null;
function getIAP() {
  if (!_IAP) {
    try {
      _IAP = require('react-native-iap');
    } catch (e) {
      console.warn('react-native-iap unavailable:', e.message);
    }
  }
  return _IAP;
}

const subSkus = Platform.select({
  ios: ['anatomi_premium_monthly'],
  android: ['anatomi_premium_monthly'],
});

export async function initIAP() {
  try {
    const IAP = getIAP();
    if (!IAP) return;
    await IAP.initConnection();
    if (Platform.OS === 'android') {
      await IAP.flushFailedPurchasesCachedAsPendingAndroid();
    }
  } catch (err) {
    console.warn('IAP Init Error:', err);
  }
}

export async function getPremiumSubscriptions() {
  try {
    const IAP = getIAP();
    if (!IAP) return [];
    return await IAP.getSubscriptions({ skus: subSkus });
  } catch (err) {
    console.warn('Get Subscriptions Error:', err);
    return [];
  }
}

export async function buySubscription(sku) {
  try {
    const IAP = getIAP();
    if (!IAP) throw new Error('IAP not available');
    await IAP.requestSubscription({ sku });
  } catch (err) {
    console.warn('Buy Subscription Error:', err);
    throw err;
  }
}

export function setupIAPListeners(onSuccess) {
  const IAP = getIAP();

  // If IAP native module is unavailable, return a no-op cleanup
  if (!IAP || typeof IAP.purchaseUpdatedListener !== 'function') {
    console.warn('IAP listeners not available — skipping setup');
    return () => {};
  }

  try {
    const purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase) => {
      const receipt = purchase.transactionReceipt;
      if (receipt) {
        try {
          const result = await verifySubscription(
            purchase.purchaseToken || purchase.transactionId,
            purchase.productId
          );
          if (result.success) {
            await IAP.finishTransaction({ purchase, isConsumable: false });
            if (onSuccess) onSuccess();
          }
        } catch (err) {
          console.warn('Verification Error:', err);
        }
      }
    });

    const purchaseErrorSubscription = IAP.purchaseErrorListener((error) => {
      console.warn('Purchase Error:', error);
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  } catch (err) {
    console.warn('IAP Listener Setup Error:', err);
    return () => {};
  }
}

export async function restorePurchases() {
  try {
    const IAP = getIAP();
    if (!IAP) return [];
    return await IAP.getAvailablePurchases();
  } catch (err) {
    console.warn('Restore Purchases Error:', err);
    return [];
  }
}
