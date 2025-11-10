const cache = new Map();

/**
 * Gets a value from the cache.
 * @param {string} key The cache key.
 * @returns {any | null} The cached value or null if not found or expired.
 */
function get(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    console.log(`[Cache] HIT for key: ${key}`);
    return entry.value;
  }
  console.log(`[Cache] MISS for key: ${key}`);
  return null;
}

/**
 * Sets a value in the cache with a TTL (Time-To-Live).
 * @param {string} key The cache key.
 * @param {any} value The value to cache.
 * @param {number} ttlSeconds Time-to-live in seconds.
 */
function set(key, value, ttlSeconds) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiresAt });
  console.log(`[Cache] SET for key: ${key} with TTL: ${ttlSeconds}s`);
}

module.exports = {
  get,
  set,
};