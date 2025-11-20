/**
 * Lazy-Loading Cache Manager for Large JSON Files
 * Loads files on first request and keeps them in memory
 * Supports gzip-compressed .json.gz files for faster loading
 */

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

class DataCache {
  constructor() {
    this.cache = {};
    this.loadTimestamps = {};
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get data from cache or load from file
   * @param {string} key - Cache key (e.g., 'prog2024', 'module2025')
   * @param {string} filePath - Path to JSON file
   * @returns {Object} - Loaded data
   */
  get(key, filePath) {
    // Check if data is in cache
    if (this.cache[key]) {
      this.cacheHits++;
      console.log(`Cache HIT for ${key} (hits: ${this.cacheHits}, misses: ${this.cacheMisses})`);
      return this.cache[key];
    }

    // Data not in cache, load from file
    this.cacheMisses++;

    try {
      const fullPath = path.resolve(filePath);
      const gzipPath = fullPath + '.gz';
      let data;
      let loadTime = Date.now();

      // Try loading compressed version first
      if (fs.existsSync(gzipPath)) {
        console.log(`Cache MISS for ${key}, loading compressed file from ${gzipPath}...`);
        const compressed = fs.readFileSync(gzipPath);
        const decompressed = zlib.gunzipSync(compressed);
        data = JSON.parse(decompressed.toString('utf8'));

        const duration = Date.now() - loadTime;
        const compressedSize = this.formatBytes(compressed.length);
        const decompressedSize = this.formatBytes(decompressed.length);
        console.log(`Loaded ${key} from gzip (${compressedSize} → ${decompressedSize}) in ${duration}ms`);
      } else {
        // Fall back to uncompressed JSON file
        console.log(`Cache MISS for ${key}, loading from ${filePath}...`);
        data = require(fullPath);

        const duration = Date.now() - loadTime;
        console.log(`Loaded ${key} from uncompressed JSON in ${duration}ms`);
      }

      // Store in cache
      this.cache[key] = data;
      this.loadTimestamps[key] = Date.now();

      console.log(`Cached ${key} successfully (memory size: ${this.getMemorySize(data)})`);

      return data;
    } catch (error) {
      console.error(`Failed to load ${key} from ${filePath}:`, error.message);
      throw new Error(`Failed to load data file: ${key}`);
    }
  }

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key to clear
   */
  clear(key) {
    if (this.cache[key]) {
      delete this.cache[key];
      delete this.loadTimestamps[key];
      console.log(`Cleared cache for ${key}`);
    }
  }

  /**
   * Clear all cache
   */
  clearAll() {
    const keys = Object.keys(this.cache);
    this.cache = {};
    this.loadTimestamps = {};
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log(`Cleared all cache (${keys.length} entries)`);
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const entries = Object.keys(this.cache).length;
    const hitRate = this.cacheHits + this.cacheMisses > 0
      ? ((this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100).toFixed(2)
      : 0;

    return {
      entries,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: `${hitRate}%`,
      cachedKeys: Object.keys(this.cache),
      memoryEstimate: this.getEstimatedMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cached data
   * @returns {string} - Memory usage in human-readable format
   */
  getEstimatedMemoryUsage() {
    let totalSize = 0;

    for (const key in this.cache) {
      totalSize += this.getMemorySize(this.cache[key]);
    }

    return this.formatBytes(totalSize);
  }

  /**
   * Estimate size of object in memory
   * @param {any} obj - Object to measure
   * @returns {number} - Estimated size in bytes
   */
  getMemorySize(obj) {
    const str = JSON.stringify(obj);
    return str.length * 2; // Approximate: each char is 2 bytes in JS
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if cache entry exists
   * @param {string} key - Cache key
   * @returns {boolean} - True if cached
   */
  has(key) {
    return !!this.cache[key];
  }

  /**
   * Get age of cache entry in milliseconds
   * @param {string} key - Cache key
   * @returns {number|null} - Age in ms, or null if not found
   */
  getCacheAge(key) {
    if (!this.loadTimestamps[key]) return null;
    return Date.now() - this.loadTimestamps[key];
  }
}

// Create singleton instance
const dataCache = new DataCache();

module.exports = dataCache;
