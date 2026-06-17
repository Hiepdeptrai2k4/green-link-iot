import React, { useState, useEffect, useCallback } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Clock,
  Save,
  Trash2,
  Plus,
  Settings,
  X,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import DeviceControl from '../components/DeviceControl';
import { Client } from '@stomp/stompjs';

function EmptyGardenState() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto my-20 font-sans">
      <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 animate-bounce">
        <AlertCircle className="w-16 h-16" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-800">Không có vườn hoạt động</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Chưa có vườn nào được kích hoạt. Vui lòng liên hệ Admin để cấu hình kết nối thiết bị!
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, currentGardenId, gardens, setCurrentGardenId } = useAuth();

  const [activeTab, setActiveTab] = useState('monitor'); // monitor, threshold, schedule
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Sensor / Live State
  const [sensors, setSensors] = useState({ 
    temp: 26.5, 
    humi: 68.2, 
    lux: 1250.0, 
    soil: 55.0,
    led: "OFF",
    fan: "OFF",
    pump: "OFF",
    mode: "MANUAL"
  });
  const [history, setHistory] = useState([]);

  // Threshold Configuration State (Tab 2)
  const [thresholds, setThresholds] = useState({
    mode: 'MANUAL',
    minSoilMoisture: 40,
    maxTemperature: 32
  });
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Scheduler Timers State (Tab 3)
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    deviceType: 'PUMP',
    startTime: '08:00',
    durationMinutes: 15,
    isActive: true
  });

  const activeGarden = gardens.find(g => (g.deviceId || g.id)?.toString() === currentGardenId?.toString()) || gardens[0];

  // ---- Fetch Telemetry & History ----
  const fetchGardenTelemetry = useCallback(async () => {
    if (!currentGardenId) return;
    
    setLoading(true);
    setError(null);
    try {
      const [sensorsRes, historyRes] = await Promise.all([
        apiService.getSensors(currentGardenId),
        apiService.getHistory(currentGardenId)
      ]);

      const d = sensorsRes && sensorsRes.data !== undefined ? sensorsRes.data : sensorsRes;
      if (d) {
        setSensors(prev => ({
          ...prev,
          temp: d.temp ?? d.temperature ?? prev.temp,
          humi: d.humi ?? d.humidity ?? prev.humi,
          lux: d.lux ?? prev.lux,
          soil: d.soil ?? prev.soil,
          led: d.led ?? prev.led,
          fan: d.fan ?? prev.fan,
          pump: d.pump ?? prev.pump,
          mode: d.mode ?? prev.mode
        }));
      }

      const histData = historyRes && historyRes.data !== undefined ? historyRes.data : historyRes;
      if (histData) {
        setHistory(Array.isArray(histData) ? histData : []);
      }
    } catch (err) {
      console.warn("Could not retrieve real-time IoT metrics:", err);
      setError("Không thể đồng bộ với máy chủ Green Link IoT HTTP API.");
    } finally {
      setLoading(false);
    }
  }, [currentGardenId]);

  // ---- Fetch Threshold Data ----
  const fetchThresholds = useCallback(async () => {
    if (!currentGardenId) return;
    try {
      const res = await apiService.getThresholds(currentGardenId);
      const thresh = res && res.data !== undefined ? res.data : res;
      if (thresh) {
        setThresholds({
          mode: thresh.mode ?? 'MANUAL',
          minSoilMoisture: thresh.minSoilMoisture ?? 40,
          maxTemperature: thresh.maxTemperature ?? 32
        });
      }
    } catch (err) {
      console.error("Failed to load thresholds:", err);
    }
  }, [currentGardenId]);

  // ---- Fetch Schedules Data ----
  const fetchSchedules = useCallback(async () => {
    if (!currentGardenId) return;
    setLoadingSchedules(true);
    try {
      const res = await apiService.getSchedules(currentGardenId);
      const scheds = res && res.data !== undefined ? res.data : res;
      if (scheds) {
        setSchedules(Array.isArray(scheds) ? scheds : []);
      }
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoadingSchedules(false);
    }
  }, [currentGardenId]);

  // Sync data dynamically based on active tab and selected garden
  useEffect(() => {
    if (currentGardenId) {
      fetchGardenTelemetry();
      if (activeTab === 'threshold') fetchThresholds();
      if (activeTab === 'schedule') fetchSchedules();
    }
  }, [currentGardenId, fetchGardenTelemetry, activeTab, fetchThresholds, fetchSchedules]);

  // ---- WebSocket Leak Prevention and Native Binding ----
  useEffect(() => {
    if (!currentGardenId) return;

    const socketUrl = 'ws://localhost:8080/ws-garden';
    console.log(`[WebSocket] Connecting to ${socketUrl} for Garden ${currentGardenId}`);
    
    // Create @stomp/stompjs Client using native browser WebSocket
    const client = new Client({
      brokerURL: socketUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      webSocketFactory: () => new WebSocket(socketUrl),
      onConnect: () => {
        console.log(`[WebSocket] Subscribed to topic: /topic/garden/${currentGardenId}`);
        setWsConnected(true);
        setError(null);

        client.subscribe(`/topic/garden/${currentGardenId}`, (message) => {
          if (message.body) {
            try {
              const data = JSON.parse(message.body);
              console.log('[WebSocket] Broadcast received:', data);

              setSensors(prev => ({
                ...prev,
                temp: data.temp ?? prev.temp,
                humi: data.humi ?? prev.humi,
                lux: data.lux ?? prev.lux,
                soil: data.soil ?? prev.soil,
                led: data.led ?? prev.led,
                fan: data.fan ?? prev.fan,
                pump: data.pump ?? prev.pump,
                mode: data.mode ?? prev.mode
              }));

              setHistory(prev => {
                const now = new Date();
                const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                const newPoint = {
                  time: timeStr,
                  Temperature: data.temp ?? prev.temp,
                  Humidity: data.humi ?? prev.humi,
                  Soil: data.soil ?? prev.soil
                };
                
                const updated = [...prev, newPoint];
                if (updated.length > 15) {
                  return updated.slice(updated.length - 15);
                }
                return updated;
              });
            } catch (err) {
              console.error('Failed to parse WebSocket JSON payload:', err);
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP Protocol Handshake Error:', frame.headers['message']);
        setWsConnected(false);
      },
      onWebSocketClose: () => {
        console.log('WebSocket connection closed.');
        setWsConnected(false);
      }
    });

    client.activate();

    // Cleanup: close WebSocket connection to prevent leakages
    return () => {
      console.log(`[WebSocket] Cleaning up and deactivating client for Garden ${currentGardenId}`);
      client.deactivate();
      setWsConnected(false);
    };
  }, [currentGardenId]);

  // ---- Threshold Event Handlers ----
  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    setSavingThreshold(true);
    try {
      await apiService.updateThresholds(currentGardenId, thresholds);
      setSensors(prev => ({ ...prev, mode: thresholds.mode }));
      alert("Đồng bộ cấu hình tự động thành công!");
    } catch (err) {
      console.error(err);
      alert("Không thể lưu cấu hình.");
    } finally {
      setSavingThreshold(false);
    }
  };

  // ---- Schedule Event Handlers ----
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await apiService.addSchedule(currentGardenId, newSchedule);
      const addedSched = res && res.data !== undefined ? res.data : res;
      if (addedSched && addedSched.id) {
        setSchedules(prev => [...prev, addedSched]);
        setShowAddModal(false);
        setNewSchedule({ deviceType: 'PUMP', startTime: '08:00', durationMinutes: 15, isActive: true });
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi thêm lịch hẹn.");
    }
  };

  const handleToggleSchedule = async (scheduleId, currentActive) => {
    try {
      const targetActive = !currentActive;
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, isActive: targetActive } : s));
      await apiService.toggleSchedule(currentGardenId, scheduleId, targetActive);
    } catch (err) {
      console.error(err);
      // Revert state
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, isActive: currentActive } : s));
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Bạn có chắc muốn xóa lịch này không?")) return;
    try {
      await apiService.deleteSchedule(currentGardenId, scheduleId);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa lịch hẹn.");
    }
  };

  // Explicit check for active gardens
  if (!gardens || gardens.length === 0 || !currentGardenId) {
    return <EmptyGardenState />;
  }

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto flex-grow flex flex-col justify-start">
      
      {/* Welcome & Garden Dropdown Picker */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex-shrink-0 font-sans">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Xin chào, {user?.name || 'Farmer'}!</h2>
            <div className="flex flex-wrap items-center gap-3 text-green-100 text-sm">
              <span>Đang giám sát khu vườn: </span>
              <div className="relative inline-block text-left">
                <select
                  value={currentGardenId}
                  onChange={(e) => setCurrentGardenId(e.target.value)}
                  className="bg-white/20 hover:bg-white/30 text-white font-extrabold px-3 py-1.5 rounded-xl border border-white/20 outline-none transition duration-200 cursor-pointer focus:ring-2 focus:ring-green-400"
                >
                  {gardens.map(g => {
                    const devId = g.deviceId || g.id;
                    return (
                      <option key={devId} value={devId} className="text-slate-800 font-bold">
                        {g.deviceName || g.name || devId}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 mt-2">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-ping' : 'bg-rose-500 animate-pulse'}`}></span>
              <span>{wsConnected ? `Native WebSocket Active (${activeGarden?.deviceName || activeGarden?.name || 'Vườn'})` : 'Connection Offline'}</span>
            </div>
          </div>
          <button 
            onClick={fetchGardenTelemetry} 
            disabled={loading}
            className="self-start md:self-auto flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-xl text-sm font-bold transition duration-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm mới nhanh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-amber-800 text-sm shadow-sm flex-shrink-0 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Cảnh báo hệ thống</p>
            <p className="text-amber-700/90">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px flex-shrink-0">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'monitor' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Giám sát & Điều khiển
        </button>
        <button
          onClick={() => { setActiveTab('threshold'); fetchThresholds(); }}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'threshold' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Cấu hình tự động
        </button>
        <button
          onClick={() => { setActiveTab('schedule'); fetchSchedules(); }}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'schedule' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Lịch hẹn giờ (Timer)
        </button>
      </div>

      {/* TAB CONTENT PANEL */}
      <div className="flex-grow flex flex-col justify-start">
        {loading && activeTab === 'monitor' ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-10 h-10 animate-spin text-green-600" />
            <p className="text-sm font-bold text-slate-500">Đang đồng bộ cấu hình qua API...</p>
          </div>
        ) : (
          <>
            {/* 1. MONITOR TAB */}
            {activeTab === 'monitor' && (
              <div className="space-y-8 flex-grow flex flex-col">
                {/* 4 Sensor Cards */}
                <section className="flex-shrink-0 font-sans">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Thông số cảm biến thời gian thực (ESP32)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nhiệt độ</p>
                        <h3 className="text-3xl font-black text-slate-800">{sensors.temp.toFixed(1)} <span className="text-xl font-bold text-slate-400">°C</span></h3>
                        <p className="text-[10px] text-red-500/80 font-medium">Tối ưu: 20°C - 28°C</p>
                      </div>
                      <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl">
                        <Thermometer className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Độ ẩm không khí</p>
                        <h3 className="text-3xl font-black text-slate-800">{sensors.humi.toFixed(1)} <span className="text-xl font-bold text-slate-400">%</span></h3>
                        <p className="text-[10px] text-blue-500/80 font-medium">Tối ưu: 50% - 70%</p>
                      </div>
                      <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl">
                        <Droplets className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cường độ sáng</p>
                        <h3 className="text-3xl font-black text-slate-800">{sensors.lux.toLocaleString()} <span className="text-xl font-bold text-slate-400">Lux</span></h3>
                        <p className="text-[10px] text-amber-500/80 font-medium">Tối ưu: &gt; 1000 Lux</p>
                      </div>
                      <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl">
                        <Sun className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Độ ẩm đất</p>
                        <h3 className="text-3xl font-black text-slate-800">{sensors.soil.toFixed(1)} <span className="text-xl font-bold text-slate-400">%</span></h3>
                        <p className="text-[10px] text-emerald-500/80 font-medium">Tối ưu: 40% - 60%</p>
                      </div>
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Droplets className="w-8 h-8 text-emerald-500" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3 Rocker Switches */}
                <section className="flex-shrink-0 font-sans">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Điều khiển rơ-le thiết bị</h2>
                  <DeviceControl 
                    gardenId={currentGardenId} 
                    pump={sensors.pump}
                    fan={sensors.fan}
                    led={sensors.led}
                    mode={sensors.mode}
                  />
                </section>

                {/* History Trend Line */}
                <section className="flex-grow flex flex-col min-h-[380px] font-sans">
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col flex-grow space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-shrink-0">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Biểu đồ xu hướng vận hành</h2>
                        <p className="text-xs text-slate-500">Thông số trực tiếp của vườn cập nhật tự động từ ESP32</p>
                      </div>
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span>Chỉ số trực tiếp</span>
                      </div>
                    </div>
                    
                    <div className="w-full flex-grow pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="time" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={11} dy={10} />
                          <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={11} dx={-10} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              borderRadius: '16px', 
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                              fontSize: '13px'
                            }} 
                          />
                          <Legend 
                            verticalAlign="top" 
                            height={36} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingBottom: '10px' }}
                          />
                          <Line name="Nhiệt độ (°C)" type="monotone" dataKey="Temperature" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                          <Line name="Độ ẩm không khí (%)" type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                          <Line name="Độ ẩm đất (%)" type="monotone" dataKey="Soil" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 2. AUTO THRESHOLD TAB */}
            {activeTab === 'threshold' && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm max-w-2xl w-full mx-auto font-sans animate-fade-in">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-5 mb-6">
                  <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Thiết lập thông số Tự động (AUTO)</h2>
                    <p className="text-sm text-slate-500">Đặt các giới hạn để kích hoạt thiết bị tự động</p>
                  </div>
                </div>

                <form onSubmit={handleSaveThresholds} className="space-y-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-start space-x-3 text-slate-700 text-sm">
                    <Sparkles className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Chế độ vận hành</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Chuyển đổi chế độ hoạt động chính của khu vườn. Ở chế độ <strong>AUTO</strong>, hệ thống tự kích hoạt tưới nếu độ ẩm nằm dưới mức tối thiểu.
                      </p>
                      <div className="mt-3 flex items-center space-x-3">
                        <select
                          value={thresholds.mode}
                          onChange={(e) => setThresholds(prev => ({ ...prev, mode: e.target.value }))}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="MANUAL">THỦ CÔNG (MANUAL)</option>
                          <option value="AUTO">TỰ ĐỘNG (AUTO)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Min Soil Moisture */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-slate-700 font-bold text-sm">Độ ẩm đất tối thiểu (Min Moisture)</label>
                      <span className="font-black text-green-600 text-lg">{thresholds.minSoilMoisture}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={thresholds.minSoilMoisture} 
                      onChange={(e) => setThresholds(prev => ({ ...prev, minSoilMoisture: parseInt(e.target.value) }))}
                      className="w-full accent-green-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none border border-slate-100" 
                    />
                  </div>

                  {/* Max Temperature */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-slate-700 font-bold text-sm">Nhiệt độ tối đa (Max Temp)</label>
                      <span className="font-black text-rose-500 text-lg">{thresholds.maxTemperature}°C</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="45" 
                      value={thresholds.maxTemperature} 
                      onChange={(e) => setThresholds(prev => ({ ...prev, maxTemperature: parseInt(e.target.value) }))}
                      className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none border border-slate-100" 
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingThreshold}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-3 px-6 rounded-2xl transition duration-200 shadow-md disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingThreshold ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. SCHEDULE / TIMER TAB */}
            {activeTab === 'schedule' && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col font-sans animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Thiết lập lịch hẹn bật/tắt thiết bị</h2>
                      <p className="text-sm text-slate-500">Quản lý và kích hoạt các lịch tưới ngầm theo giờ</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-2.5 px-5 rounded-2xl transition duration-200 shadow-md text-sm active:scale-95 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm lịch mới</span>
                  </button>
                </div>

                {loadingSchedules ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
                    <p className="text-xs text-slate-400">Đang tải lịch hẹn giờ...</p>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="py-20 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-6">
                    <Clock className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="font-bold text-slate-700">Chưa có lịch hẹn giờ nào</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">Nhấn nút "Thêm lịch mới" để bắt đầu đặt lịch tự động.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedules.map((sched) => (
                      <div 
                        key={sched.id} 
                        className={`border rounded-3xl p-5 flex flex-col justify-between h-44 shadow-sm hover:shadow-md transition duration-300 ${
                          sched.isActive ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-slate-200/60 opacity-75'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100 capitalize">
                              {sched.actuatorName === 'LIGHT' || sched.actuatorName === 'LED' ? 'Đèn chiếu sáng' : sched.actuatorName === 'FAN' ? 'Quạt làm mát' : 'Máy bơm nước'}
                            </span>
                            <h4 className="text-3xl font-black text-slate-800 mt-2">{sched.startTime}</h4>
                            <p className="text-xs text-slate-400 mt-1">Hoạt động trong: <strong className="text-slate-600">{sched.durationMinutes} phút</strong></p>
                          </div>
                          
                          <button
                            onClick={() => handleToggleSchedule(sched.id, sched.isActive)}
                            className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                              sched.isActive ? 'bg-green-600' : 'bg-slate-300'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              sched.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Trạng thái: {sched.isActive ? 'Đang bật' : 'Tạm dừng'}
                          </span>
                          <button
                            onClick={() => handleDeleteSchedule(sched.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition duration-200"
                            title="Xóa lịch hẹn"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ADD SCHEDULE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-5">
              <Clock className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-slate-900 text-lg">Tạo lịch hẹn giờ mới</h3>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thiết bị</label>
                <select
                  value={newSchedule.deviceType}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, deviceType: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm"
                >
                  <option value="PUMP">Máy bơm nước (PUMP)</option>
                  <option value="FAN">Quạt làm mát (FAN)</option>
                  <option value="LIGHT">Đèn chiếu sáng (LIGHT)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian bắt đầu</label>
                  <input
                    type="time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-600"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian bật (Phút)</label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={newSchedule.durationMinutes}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 15 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-600"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-2xl text-sm transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-2.5 px-5 rounded-2xl text-sm transition shadow-md"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
