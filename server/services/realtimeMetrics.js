const ACTIVE_WINDOW_MS = 10 * 1000;
const TREND_WINDOW_DAYS = 7;
const MAX_ACTIVITY_ITEMS = 200;

const activeUsers = new Map();
const scanEvents = [];
const activityEvents = [];
let totalScanRequests = 0;
let failedScanRequests = 0;

const toUserKey = (userId) => String(userId || "").trim();

const cleanupActiveUsers = () => {
  const now = Date.now();
  for (const [userId, lastSeen] of activeUsers.entries()) {
    if (now - lastSeen > ACTIVE_WINDOW_MS) {
      activeUsers.delete(userId);
    }
  }
};

const cleanupScanEvents = () => {
  const now = Date.now();
  const cutoff = now - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  while (scanEvents.length && scanEvents[0].timestamp < cutoff) {
    scanEvents.shift();
  }
};

const pushActivity = (message, type = "info") => {
  activityEvents.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    message,
    type,
    timestamp: new Date().toISOString()
  });

  if (activityEvents.length > MAX_ACTIVITY_ITEMS) {
    activityEvents.length = MAX_ACTIVITY_ITEMS;
  }
};

export const markUserActive = (userId) => {
  const key = toUserKey(userId);
  if (!key) return;
  activeUsers.set(key, Date.now());
};

export const markUserInactive = (userId) => {
  const key = toUserKey(userId);
  if (!key) return;
  activeUsers.delete(key);
};

export const getActiveUsersCount = () => {
  cleanupActiveUsers();
  return activeUsers.size;
};

export const recordScanRequest = ({ success }) => {
  totalScanRequests += 1;
  if (!success) {
    failedScanRequests += 1;
  }

  scanEvents.push({ timestamp: Date.now() });
  cleanupScanEvents();

  pushActivity(success ? "User scanned a URL" : "Scan request failed", success ? "scan" : "warning");
};

export const getTotalScanRequests = () => totalScanRequests;

export const getScanErrorRate = () => {
  if (!totalScanRequests) return 0;
  return Number(((failedScanRequests / totalScanRequests) * 100).toFixed(1));
};

export const getScanRequestsTrend = () => {
  cleanupScanEvents();

  const now = new Date();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayBuckets = [];

  for (let i = TREND_WINDOW_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - i);

    dayBuckets.push({
      day: labels[date.getDay()],
      key: date.toISOString().slice(0, 10),
      requests: 0
    });
  }

  const bucketIndex = new Map(dayBuckets.map((item, idx) => [item.key, idx]));

  for (const event of scanEvents) {
    const key = new Date(event.timestamp).toISOString().slice(0, 10);
    const idx = bucketIndex.get(key);
    if (idx !== undefined) {
      dayBuckets[idx].requests += 1;
    }
  }

  return dayBuckets.map(({ day, requests }) => ({ day, requests }));
};

export const recordActivity = (message, type = "info") => {
  pushActivity(message, type);
};

export const getRecentActivity = (limit = 5) => activityEvents.slice(0, Math.max(1, limit));
