import axios from 'axios';

// Create an instance of Axios with default configurations
const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically intercept outgoing requests to attach JWT Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Intercept incoming responses to globally handle common errors (such as 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => {
    // Unpack data from the Axios response envelope for easier consumption in services
    return response.data;
  },
  (error) => {
    const { response } = error;
    
    // Globally handle 401 Unauthorized responses (token expired or invalid)
    if (response && response.status === 401) {
      // Flush client authentication data from storage
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      
      // Redirect to the login page (avoiding endless redirect loops)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
