import axiosClient from './axiosClient';

/**
 * IoT Smart Garden Service Layer
 * Interacts with Spring Boot APIs via the configured axiosClient.
 */
const iotService = {
  /**
   * Authenticate a user with credentials (e.g., username/email and password).
   * @param {Object} credentials - { username, password }
   * @returns {Promise<Object>} Resolves to authentication response (containing jwt_token and user object).
   */
  login: (credentials) => {
    return axiosClient.post('/auth/login', credentials);
  },

  /**
   * Fetch active sensor data for a specific garden.
   * @param {string|number} gardenId - Unique identifier of the garden.
   * @returns {Promise<Object>} Current telemetry values (temperature, soil moisture, light intensity).
   */
  getSensors: (gardenId) => {
    return axiosClient.get(`/gardens/${gardenId}/sensors`);
  },

  /**
   * Fetch historical telemetry logs for a specific garden (e.g., last 7 days).
   * @param {string|number} gardenId - Unique identifier of the garden.
   * @returns {Promise<Array>} A list of historical sensor data records.
   */
  getHistory: (gardenId) => {
    return axiosClient.get(`/gardens/${gardenId}/history`);
  },

  /**
   * Toggle device status (e.g., Turn Water Pump ON/OFF, Cooling Fan ON/OFF, Growth Lights ON/OFF).
   * @param {string|number} deviceId - Identifier of the device relay.
   * @param {boolean|string} status - New target status (e.g., true/false or "ON"/"OFF").
   * @returns {Promise<Object>} Response confirmation of the command delivery.
   */
  toggleDevice: (deviceId, status) => {
    return axiosClient.post(`/devices/${deviceId}/toggle`, { status });
  }
};

export default iotService;
