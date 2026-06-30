import axiosClient from './axiosClient';

const apiService = {
  /**
   * Fetch latest telemetry for a specific garden/device
   */
  getSensors: async (deviceId) => {
    return await axiosClient.get(`/garden/${deviceId}/latest`);
  },
  
  /**
   * Fetch historical trend charts for a specific garden/device
   */
  getHistory: async (deviceId) => {
    return await axiosClient.get(`/garden/${deviceId}/history`);
  },
  
  getActuatorHistory: async (deviceId) => {
    return await axiosClient.get(`/garden/${deviceId}/actuator-history`);
  },
  
  /**
   * Post control command to a specific garden/device
   * deviceId format: "{realDeviceId}-{deviceType}" (e.g. "User_Hiep_01-pump")
   */
  toggleDevice: async (deviceId, status) => {
    const lastHyphen = deviceId.lastIndexOf('-');
    let realDeviceId = deviceId;
    let deviceType = 'pump';
    
    if (lastHyphen !== -1) {
      realDeviceId = deviceId.substring(0, lastHyphen);
      deviceType = deviceId.substring(lastHyphen + 1);
    }
    
    let mappedDevice = deviceType.toLowerCase();
    if (mappedDevice === 'light') {
      mappedDevice = 'led';
    }

    try {
      return await axiosClient.post(`/garden/${realDeviceId}/control`, {
        device: mappedDevice,
        status: status // "ON" or "OFF"
      });
    } catch (err) {
      console.error(`HTTP control toggle request failed for device ${realDeviceId}:`, err);
      throw err;
    }
  },

  // ==========================================
  // THRESHOLDS / AUTO CONFIG API
  // ==========================================

  getThresholds: async (deviceId) => {
    return axiosClient.get(`/garden/${deviceId}/thresholds`);
  },

  updateThresholds: async (deviceId, payload) => {
    return axiosClient.post(`/garden/${deviceId}/thresholds`, payload);
  },
  
  renameGarden: async (deviceId, deviceName) => {
    return axiosClient.post(`/garden/${deviceId}/rename`, { deviceName });
  },

  getUserProfile: async (email) => {
    return axiosClient.get(`/garden/profile?email=${email}`);
  },

  updateUserProfile: async (email, payload) => {
    return axiosClient.post(`/garden/profile?email=${email}`, payload);
  },

  toggleTelegramAlerts: async (deviceId, enabled) => {
    return axiosClient.post(`/garden/${deviceId}/telegram-alerts`, { enabled });
  },

  changePassword: async (email, currentPassword, newPassword) => {
    return axiosClient.post(`/garden/change-password?email=${email}`, { currentPassword, newPassword });
  },

  sendOtp: async (email) => {
    return axiosClient.post('/auth/send-otp', { email });
  },

  verifyOtpAndResetPassword: async (email, otp, newPassword) => {
    return axiosClient.post('/auth/verify-otp-reset', { email, otp, newPassword });
  },

  // ==========================================
  // SCHEDULES / TIMERS API
  // ==========================================

  getSchedules: async (deviceId) => {
    return axiosClient.get(`/garden/${deviceId}/schedules`);
  },

  addSchedule: async (deviceId, schedule) => {
    return axiosClient.post(`/garden/${deviceId}/schedules`, schedule);
  },

  toggleSchedule: async (deviceId, scheduleId, enabled) => {
    return axiosClient.put(`/garden/${deviceId}/schedules/${scheduleId}`, { isActive: enabled });
  },

  deleteSchedule: async (deviceId, scheduleId) => {
    return axiosClient.delete(`/garden/${deviceId}/schedules/${scheduleId}`);
  },

  // ==========================================
  // ADMIN DASHBOARD MANAGEMENT API
  // ==========================================

  getAdminDevices: async () => {
    return axiosClient.get('/admin/devices');
  },

  getAdminUsers: async () => {
    return axiosClient.get('/admin/users');
  },

  createUserAccount: async (userData) => {
    return axiosClient.post('/admin/users/create', userData);
  },

  registerDevice: async (newDevice) => {
    return axiosClient.post('/admin/devices', newDevice);
  },

  connectDevice: async (deviceId) => {
    return axiosClient.post(`/admin/devices/${deviceId}/connect`);
  },

  updateUserAccount: async (id, userData) => {
    return axiosClient.put(`/admin/users/${id}`, userData);
  },

  deleteUserAccount: async (id) => {
    return axiosClient.delete(`/admin/users/${id}`);
  },

  updateDeviceDetails: async (deviceId, deviceData) => {
    return axiosClient.put(`/admin/devices/${deviceId}`, deviceData);
  },

  deleteDevice: async (deviceId) => {
    return axiosClient.delete(`/admin/devices/${deviceId}`);
  },

  register: async (userData) => {
    return axiosClient.post('/auth/register', userData);
  }
};

export default apiService;
