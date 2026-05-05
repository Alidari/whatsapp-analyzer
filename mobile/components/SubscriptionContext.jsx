import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSubscriptionStatus } from '../lib/api';

const SubscriptionContext = createContext({
  isSubscribed: false,
  quota: { used: 0, max: 1 },
  checkSubscription: async () => {},
  loading: false,
});

export const SubscriptionProvider = ({ children }) => {
  const [quota, setQuota] = useState({ used: 0, max: 1 });

  const checkSubscription = async () => {
    try {
      const status = await getSubscriptionStatus();
      setQuota({
        used: status.daily_scans_used,
        max: status.max_scans_today,
      });
    } catch (err) {
      // Ignore — backend may be unavailable
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed: false, // always false until IAP is re-enabled
      quota,
      checkSubscription,
      loading: false,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
