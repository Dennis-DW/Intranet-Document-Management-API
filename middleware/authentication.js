const jwt = require('jsonwebtoken');

/**
 * Middleware to verify a user's access token (JWT).
 * The token is expected to be in an HttpOnly cookie,
 * but as a fallback, it also checks the Authorization header.
 */
const authenticationMiddleware = (req, res, next) => {
  // 1. Try to get the token from cookies (preferred method)
  let token = req.cookies.accessToken;

  // 2. If not in cookies, check Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  // 3. If no token is found, send 401 Unauthorized
  if (!token) {
    return res.status(401).send('Unauthorized: No token provided.');
  }

  // 4. Verify the token
  try {
    // Verify the token using the secret key
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user object from the payload to the request object.
    // This flattens the structure so we can use req.user.id, req.user.role, etc.
    // directly in controllers and subsequent middleware.
    req.user = decodedPayload.user;
    
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // If verification fails (e.g., expired token, invalid signature)
    return res.status(401).send('Unauthorized: Invalid token.');
  }
};

module.exports = authenticationMiddleware;