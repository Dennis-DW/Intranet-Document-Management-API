import axios from 'axios';

/**
 * Create a base axios instance configured for the backend API.
 * As per the blueprint, we set the baseURL and enable withCredentials
 * to ensure cookies (for auth) are sent with every request.
 */
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Backend API URL
  withCredentials: true, // Crucial for sending cookies
});

// --- Authentication Endpoints ---

/**
 * Sends registration data to the backend.
 * @param {object} credentials - { username, email, password }
 */
export const register = (credentials) => api.post('/auth/register', credentials);

/**
 * Sends login data to the backend.
 * @param {object} credentials - { email, password }
 */
export const login = (credentials) => api.post('/auth/login', credentials);

/**
 * Calls the logout endpoint.
 */
export const logout = () => api.post('/auth/logout');

/**
 * Calls the refresh token endpoint.
 */
export const refreshToken = () => api.post('/auth/refresh_token');

// --- Document Endpoints ---

/**
 * Fetches the list of accessible documents, optionally filtering by tag.
 * @param {string} [tag] - Optional tag to filter documents by.
 */
export const listDocuments = (tag, page = 1, limit = 20) => {
  const params = { page, limit };
  if (tag) {
    params.tag = tag;
  }
  return api.get('/documents', { params });
};

/**
 * Uploads a file.
 * @param {FormData} formData - The FormData object containing the file.
 * @param {function} onUploadProgress - Callback to track upload progress.
 */
export const uploadDocument = (formData, onUploadProgress) => {
  return api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress, // Pass the progress callback to axios
  });
};

/**
 * Uploads a new version of an existing document.
 * @param {string} documentId - The ID of the document to update.
 * @param {FormData} formData - The FormData object containing the new file version.
 * @param {function} onUploadProgress - Callback to track upload progress.
 */
export const uploadNewVersion = (documentId, formData, onUploadProgress) => {
  return api.post(`/documents/${documentId}/versions`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};
/**
 * Downloads a specific document.
 * @param {string} versionId - The ID of the document version to download.
 */
export const downloadDocument = (versionId) => {
  return api.get(`/documents/versions/${versionId}/download`, {
    responseType: 'blob', // Important for handling file downloads
  });
};

/**
 * Deletes a specific document.
 * @param {string} documentId - The ID of the document to delete.
 */
export const deleteDocument = (documentId) => api.delete(`/documents/${documentId}`);

/**
 * Searches for documents.
 * @param {string} query - The search query string.
 */
export const searchDocuments = (query, page = 1, limit = 20) => {
  return api.get('/documents/search', { params: { q: query, page, limit } });
};

// --- User Profile Endpoints ---

/**
 * Updates the current user's profile information.
 * @param {object} profileData - { username, email }
 */
export const updateMyProfile = (profileData) => api.put('/users/me', profileData);

/**
 * Changes the current user's password.
 * @param {object} passwordData - { currentPassword, newPassword }
 */
export const changeMyPassword = (passwordData) => api.post('/users/me/password', passwordData);

// --- Notification Endpoints ---

export const getMyNotifications = (page = 1, limit = 20) => {
  return api.get('/notifications', { params: { page, limit } });
};

export const markNotificationsAsRead = () => api.put('/notifications/read');

export default api;