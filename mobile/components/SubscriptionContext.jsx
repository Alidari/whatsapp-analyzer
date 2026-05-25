import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSubscriptionStatus } from '../lib/api';
import { initIAP, setupIAPListeners } from '../lib/subscription';

const SubscriptionContext = createContext({
  isSubscribed: false,
  quota: { used: 0, max: 1 },
  checkSubscription: async () => {},
  loading: true,
});

export const SubscriptionProvider = ({ children }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [quota, setQuota] = useState({ used: 0, max: 1 });
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    try {
      const status = await getSubscriptionStatus();
      setIsSubscribed(!!status.is_subscribed);
      setQuota({
        used: status.daily_scans_used,
        max: status.max_scans_today,
      });
    } catch (err) {
      console.error('Check Sub Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    initIAP();
    
    const cleanup = setupIAPListeners(() => {
      setIsSubscribed(true);
    });

    return () => cleanup();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, quota, checkSubscription, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
