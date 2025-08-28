export let currentUser = null;
export let inventoriesCache = [];
export let activeInventoryId = null;
export let confirmCallback = null;
export let activeListeners = [];
export let lastReportData = [];

export function setCurrentUser(user) {
  currentUser = user;
}

export function setInventoriesCache(cache) {
  inventoriesCache = cache;
}

export function setActiveInventoryId(id) {
  activeInventoryId = id;
}

export function setConfirmCallback(callback) {
  confirmCallback = callback;
}

export function addActiveListener(listener) {
  activeListeners.push(listener);
}

export function clearActiveListeners() {
  activeListeners.forEach(unsubscribe => unsubscribe());
  activeListeners = [];
}

export function setLastReportData(data) {
    lastReportData = data;
}