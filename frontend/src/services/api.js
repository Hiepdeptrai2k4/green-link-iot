import axiosClient from './axiosClient';

const apiService = {
  /**
   * Fetch latest telemetry for a specific garden/device
   */
  getSensors: async (deviceId) => {
    try {
      return await axiosClient.get(`/garden/${deviceId}/latest`);
    } catch (err) {
      console.warn(`Could not retrieve telemetry for device ${deviceId}, using defaults:`, err);
      return {
        data: {
          temp: 26.5,
          humi: 68.2,
          lux: 1250,
          soil: 55.0,
          led: "OFF",
          fan: "OFF",
          pump: "OFF",
          mode: "MANUAL"
        }
      };
    }
  },
  
  /**
   * Fetch historical trend charts for a specific garden/device
   */
  getHistory: async (deviceId) => {
    try {
      return await axiosClient.get(`/garden/${deviceId}/history`);
    } catch (err) {
      console.warn("Could not retrieve history logs, generating local fallback:", err);
      const mockHistory = Array.from({ length: 12 }, (_, i) => {
        const hour = (new Date().getHours() - (11 - i) + 24) % 24;
        return {
          time: `${hour.toString().padStart(2, '0')}:00`,
          Temperature: parseFloat((24 + Math.sin(i / 2) * 3 + Math.random() * 0.4).toFixed(1)),
          Humidity: Math.round(55 + Math.cos(i / 2) * 8 + Math.random() * 2),
          Soil: Math.round(50 + Math.sin(i / 3) * 5 + Math.random() * 1.5),
        };
      });
      return { data: mockHistory };
    }
  },
  
  getActuatorHistory: async (deviceId) => {
    try {
      return await axiosClient.get(`/garden/${deviceId}/actuator-history`);
    } catch (err) {
      console.warn("Could not retrieve actuator history logs, returning local fallback:", err);
      return { data: [] };
    }
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
  }
};

export default apiService;
