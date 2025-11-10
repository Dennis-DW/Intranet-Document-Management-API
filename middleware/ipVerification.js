const ipNameMap = new Map();

// Parse the IP_NAME_MAPPING environment variable on startup
// Format: "ip1:Name One,ip2:Name Two"
if (process.env.IP_NAME_MAPPING) {
  const pairs = process.env.IP_NAME_MAPPING.split(',');
  pairs.forEach(pair => {
    const [ip, name] = pair.split(':');
    if (ip && name) {
      ipNameMap.set(ip.trim(), name.trim());
    }
  });
}

const ipVerificationMiddleware = (req, res, next) => {
    const whitelist = process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(',') : [];
  
    // Get the client's IP address.
    // This respects the 'trust proxy' setting in index.js.
    const clientIp = req.ip;
  
    // Log the whitelist and the client's IP for debugging
    // console.log(`[IP Verification] Whitelist: ${whitelist}`); // Can be noisy, commented out
    console.log(`[IP Verification] Client IP: ${clientIp}`);
  
    // --- NEW: Attach network name to the request ---
    // Look up the friendly name for the IP, or default to 'Unknown Network'
    req.networkName = ipNameMap.get(clientIp) || 'Unknown Network';

    // Check if the client's IP is in the whitelist (existing logic)
    if (whitelist.includes(clientIp)) {
      // If the IP is whitelisted, proceed to the next middleware
      next();
    } else {
      // If the IP is not in the whitelist, reject the request
      console.warn(`Blocked request from non-whitelisted IP: ${clientIp}`);
      res.status(403).send('Forbidden: Access is restricted to authorized networks.');
    }
  };
  
  module.exports = ipVerificationMiddleware;