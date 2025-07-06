const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://your-render-app.onrender.com'
  : 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  PROFILE: `${API_BASE_URL}/api/auth/profile`,
  
  // Camera endpoints
  CAMERAS: `${API_BASE_URL}/api/cameras`,
  CAMERA_BY_ID: (id) => `${API_BASE_URL}/api/cameras/${id}`,
  
  // EZVIZ endpoints
  LIVE_STREAM: `${API_BASE_URL}/api/ezviz/live`,
  PLAYBACK: `${API_BASE_URL}/api/ezviz/playback`,
  RECORDINGS: `${API_BASE_URL}/api/ezviz/recordings`,
  STATUS: `${API_BASE_URL}/api/ezviz/status`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/health`
};

export default API_BASE_URL; 