// Subscription module — IAP deactivated, will be re-enabled later.
// All functions are stubs that return safe empty values.

export async function initIAP() {}
export async function getPremiumSubscriptions() { return []; }
export async function buySubscription() { throw new Error('Abonelik şu an aktif değil.'); }
export async function restorePurchases() { return []; }
export function setupIAPListeners() { return () => {}; }
