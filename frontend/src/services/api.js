// NOTE: When connecting to the real Spring Boot backend, replace mock
// functions below with axios calls:
//   import axios from 'axios';
//   const client = axios.create({ baseURL: process.env.REACT_APP_API_URL });

// Mock DB configuration for different gardens
const mockDb = {
  gardens: {
    'vuon-lan': {
      name: 'Vườn Lan',
      sensors: { temperature: 26.5, humidity: 68.2, light: 1250 },
      devices: { pump: false, fan: true, light: false }
    },
    'vuon-cam': {
      name: 'Vườn Cam',
      sensors: { temperature: 29.8, humidity: 55.4, light: 3400 },
      devices: { pump: false, fan: false, light: true }
    }
  },
  history: {
    'vuon-lan': Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, '0')}:00`,
      Temperature: parseFloat((24 + Math.sin(i / 3) * 3 + Math.random() * 0.4).toFixed(1)),
      Humidity: Math.round(65 + Math.cos(i / 3) * 8 + Math.random() * 2),
    })),
    'vuon-cam': Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, '0')}:00`,
      Temperature: parseFloat((27 + Math.sin(i / 3) * 4 + Math.random() * 0.4).toFixed(1)),
      Humidity: Math.round(52 + Math.cos(i / 3) * 7 + Math.random() * 2),
    }))
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const apiService = {
  getSensors: async (gardenId) => {
    await delay(300);
    const id = gardenId === 'vuon-cam' ? 'vuon-cam' : 'vuon-lan';
    return { data: mockDb.gardens[id].sensors };
  },
  
  getHistory: async (gardenId) => {
    await delay(400);
    const id = gardenId === 'vuon-cam' ? 'vuon-cam' : 'vuon-lan';
    return { data: mockDb.history[id] };
  },
  
  toggleDevice: async (deviceId, status) => {
    await delay(500);
    const parts = deviceId.split('-');
    const gardenId = parts[0] === 'vuon-cam' ? 'vuon-cam' : 'vuon-lan';
    const deviceType = parts[1] || 'pump'; // pump, fan, light
    
    if (mockDb.gardens[gardenId]) {
      mockDb.gardens[gardenId].devices[deviceType] = (status === 'ON');
    }
    
    return { data: { success: true, deviceId, status } };
  }
};

export default apiService;
