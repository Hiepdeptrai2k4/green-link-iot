import React, { useState, useEffect, useCallback } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Cpu, 
  Clock, 
  RefreshCw, 
  Activity, 
  Database,
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

export default function HistoryPage() {
  const { currentGardenId, gardens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [actuatorHistory, setActuatorHistory] = useState([]);
  const [activeParam, setActiveParam] = useState('temp-humi'); // temp-humi, soil, lux
  const [refreshing, setRefreshing] = useState(false);

  const activeGarden = gardens.find(g => (g.deviceId || g.id)?.toString() === currentGardenId?.toString()) || gardens[0];

  const fetchHistoryData = useCallback(async (isSilent = false) => {
    if (!currentGardenId) return;
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [sensorRes, actuatorRes] = await Promise.all([
        apiService.getHistory(currentGardenId),
        apiService.getActuatorHistory(currentGardenId)
      ]);
      
      const sensorData = sensorRes && sensorRes.data !== undefined ? sensorRes.data : sensorRes;
      if (sensorData) {
        setSensorHistory(Array.isArray(sensorData) ? sensorData : []);
      }
      
      const actuatorData = actuatorRes && actuatorRes.data !== undefined ? actuatorRes.data : actuatorRes;
      if (actuatorData) {
        setActuatorHistory(Array.isArray(actuatorData) ? actuatorData : []);
      }
    } catch (err) {
      console.error('Failed to sync history metrics from IoT Server:', err);
      setError('Không thể đồng bộ lịch sử thông số từ máy chủ Green Link API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentGardenId]);

  useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchHistoryData(true);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Vừa xong';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Helper for actuator names
  const getActuatorDetails = (name) => {
    const uppercase = name.toUpperCase();
    if (uppercase === 'PUMP') return { label: 'Máy bơm tưới nước', color: 'text-blue-500 bg-blue-50 border-blue-100' };
    if (uppercase === 'FAN') return { label: 'Quạt thông gió', color: 'text-amber-500 bg-amber-50 border-amber-100' };
    if (uppercase === 'LED' || uppercase === 'LIGHT') return { label: 'Đèn LED chiếu sáng', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
    return { label: name, color: 'text-slate-500 bg-slate-50 border-slate-100' };
  };

  if (!currentGardenId) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto my-20 font-sans">
        <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
          <Database className="w-16 h-16" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800">Chưa cấu hình thiết bị</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Nông trại của bạn chưa có thiết bị nào được kết nối hoạt động. Hãy liên hệ Admin để liên kết thiết bị.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Upper header banner */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-green-400" />
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Lịch sử hệ thống</h1>
            </div>
            <p className="text-slate-300 text-sm">
              Giám sát biểu đồ biến thiên thông số môi trường và theo dõi chi tiết nhật ký đóng ngắt thiết bị tại <span className="text-green-300 font-extrabold">{activeGarden?.deviceName || 'Vườn'}</span>.
            </p>
          </div>
          
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="self-start md:self-auto flex items-center space-x-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-2xl px-5 py-3 text-sm font-bold transition duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center space-x-3 text-sm shadow-sm">
          <Database className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center font-bold text-slate-400">Đang đồng bộ cơ sở dữ liệu lịch sử...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Center 2 Cols: Environmental Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header inside Chart Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Biểu đồ thông số thời gian thực</h2>
                  <p className="text-xs text-slate-500">Dữ liệu ghi nhận tự động từ mạng cảm biến</p>
                </div>
                
                {/* Visual metric switches */}
                <div className="flex bg-slate-100 p-1 rounded-2xl space-x-1 self-start sm:self-auto">
                  <button
                    onClick={() => setActiveParam('temp-humi')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeParam === 'temp-humi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Nhiệt độ & Độ ẩm
                  </button>
                  <button
                    onClick={() => setActiveParam('soil')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeParam === 'soil' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Độ ẩm đất
                  </button>
                  <button
                    onClick={() => setActiveParam('lux')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeParam === 'lux' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Cường độ ánh sáng
                  </button>
                </div>
              </div>

              {/* Responsive container for Recharts Area charts */}
              <div className="h-96 w-full">
                {sensorHistory.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Chưa nhận được lịch sử đo lường cảm biến.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sensorHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorHumi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorLux" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', fontFamily: 'sans-serif' }}
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      
                      {activeParam === 'temp-humi' && (
                        <>
                          <Area 
                            name="Nhiệt độ (°C)" 
                            type="monotone" 
                            dataKey="Temperature" 
                            stroke="#f59e0b" 
                            fillOpacity={1} 
                            fill="url(#colorTemp)" 
                            strokeWidth={3}
                          />
                          <Area 
                            name="Độ ẩm không khí (%)" 
                            type="monotone" 
                            dataKey="Humidity" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorHumi)" 
                            strokeWidth={3}
                          />
                        </>
                      )}

                      {activeParam === 'soil' && (
                        <Area 
                          name="Độ ẩm đất (%)" 
                          type="monotone" 
                          dataKey="Soil" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorSoil)" 
                          strokeWidth={3}
                        />
                      )}

                      {activeParam === 'lux' && (
                        <Area 
                          name="Ánh sáng (Lux)" 
                          type="monotone" 
                          dataKey="Lux" 
                          stroke="#eab308" 
                          fillOpacity={1} 
                          fill="url(#colorLux)" 
                          strokeWidth={3}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Nhiệt độ trung bình</p>
                  <p className="text-lg font-black text-slate-800">
                    {sensorHistory.length > 0
                      ? (sensorHistory.reduce((acc, curr) => acc + (curr.Temperature || 0), 0) / sensorHistory.length).toFixed(1)
                      : 'N/A'} °C
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Độ ẩm đất TB</p>
                  <p className="text-lg font-black text-slate-800">
                    {sensorHistory.length > 0
                      ? Math.round(sensorHistory.reduce((acc, curr) => acc + (curr.Soil || 0), 0) / sensorHistory.length)
                      : 'N/A'} %
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Số bản ghi nhận</p>
                  <p className="text-lg font-black text-slate-800">{sensorHistory.length} gói tin</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Actuator Control Logs Activity Feed */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6 flex-grow">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Lịch sử thiết bị ngoại vi</h2>
                <p className="text-xs text-slate-500">Nhật ký đóng ngắt Đèn, Quạt và Bơm nước</p>
              </div>

              {actuatorHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
                  <Clock className="w-8 h-8 text-slate-300" />
                  <span>Chưa ghi nhận hoạt động nào gần đây.</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {actuatorHistory.map((log) => {
                    const details = getActuatorDetails(log.actuatorName);
                    const isON = log.action === true;
                    return (
                      <div key={log.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 text-xs transition hover:bg-slate-100/50">
                        <div className="flex items-start space-x-2.5">
                          <div className={`p-2 rounded-xl border font-bold flex-shrink-0 ${details.color}`}>
                            <Cpu className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{details.label}</p>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </p>
                          </div>
                        </div>
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border tracking-wider flex-shrink-0 ${
                          isON 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {isON ? 'BẬT' : 'TẮT'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6">
              <div className="p-3.5 bg-green-50 rounded-2xl border border-green-100/80 flex items-start space-x-3 text-xs text-green-800 leading-relaxed">
                <Sun className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p>Hệ thống tự động đồng bộ hóa lịch sử cảm biến mỗi phút từ mạch điều khiển ESP32.</p>
              </div>
            </div>
          </div>
          
        </div>
      )}
      
    </div>
  );
}
