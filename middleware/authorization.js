const Document = require('../models/document.model');

/**
 * Middleware to authorize a single specific role.
 * @param {string} requiredRole - The role required to access the route (e.g., 'Admin').
 */
const authorize = (requiredRole) => {
    return (req, res, next) => {
      // This middleware must run *after* the authenticationMiddleware,
      // which attaches the user object to req.user.
      if (!req.user) {
        return res.status(401).send('Unauthorized: No user session found.');
      }
  
      if (req.user.role === requiredRole) {
        next(); // User has the required role, proceed
      } else {
        res.status(403).send('Forbidden: Insufficient permissions.');
      }
    };
  };
  
  /**
   * Middleware to authorize multiple roles.
   * Allows access if the user has *any* of the roles in the array.
   * @param {string[]} roles - An array of roles allowed to access the route (e.g., ['Admin', 'Manager']).
   */
  const authorizeRoles = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).send('Unauthorized: No user session found.');
      }
  
      if (roles.includes(req.user.role)) {
        next(); // User's role is in the allowed list, proceed
      } else {
        res.status(403).send('Forbidden: Insufficient permissions for this action.');
      }
    };
  };
  
  /**
   * Middleware to authorize based on document ownership or a list of roles.
   * Allows access if the user is the owner of the document OR has a role in the allowed list.
   * @param {string[]} roles - An array of roles that can bypass the ownership check (e.g., ['Admin']).
   */
  const authorizeOwnerOrRoles = (roles = []) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).send('Unauthorized: No user session found.');
      }
  
      // Admins or other specified roles can always proceed
      if (roles.includes(req.user.role)) {
        return next();
      }
  
      // Check for document ownership
      const documentId = req.params.id || req.params.documentId;
      if (!documentId) {
        return res.status(400).send('Bad Request: Document ID is missing from the request parameters.');
      }
  
      try {
        const document = await Document.findById(documentId).select('owner');
        if (!document) {
          return res.status(404).send('Document not found.');
        }
        if (document.owner.toString() === req.user.id) {
          return next(); // User is the owner, proceed
        }
      } catch (error) {
        console.error("Error during ownership check:", error);
        return res.status(500).send('Server Error');
      }
  
      // If none of the above, user is not authorized
      res.status(403).send('Forbidden: You do not have permission to perform this action.');
    };
  };
  
  module.exports = {
    authorize,
    authorizeRoles,
    authorizeOwnerOrRoles,
  };
  