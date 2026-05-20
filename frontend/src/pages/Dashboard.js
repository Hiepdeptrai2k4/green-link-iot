import React, { useState, useEffect, useCallback } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  TrendingUp,
  RefreshCw,
  AlertCircle
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

export default function Dashboard() {
  const { user, currentGardenId } = useAuth();

  // Telemetry variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sensors, setSensors] = useState({ temp: 26.5, humidity: 68.2, light: 1250 });
  const [history, setHistory] = useState([]);

  const gardens = [
    { id: 'vuon-lan', name: 'Vườn Lan' },
    { id: 'vuon-cam', name: 'Vườn Cam' }
  ];

  const activeGarden = gardens.find(g => g.id === currentGardenId) || gardens[0];

  /**
   * Fetch current sensor levels and historical telemetry logs from mock API.
   */
  const fetchGardenTelemetry = useCallback(async () => {
    if (!currentGardenId) return;
    
    setLoading(true);
    setError(null);
    try {
      const [sensorsRes, historyRes] = await Promise.all([
        apiService.getSensors(currentGardenId),
        apiService.getHistory(currentGardenId)
      ]);

      // Unpack real-time sensors
      if (sensorsRes && sensorsRes.data) {
        setSensors({
          temp: sensorsRes.data.temperature ?? 26.5,
          humidity: sensorsRes.data.humidity ?? 68.2,
          light: sensorsRes.data.light ?? 1250
        });
      }

      // Unpack historical telemetry data
      if (historyRes && historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      console.warn("Could not retrieve real-time IoT metrics:", err);
      setError("Không thể đồng bộ với máy chủ Green Link IoT.");
    } finally {
      setLoading(false);
    }
  }, [currentGardenId]);

  // Sync details on garden updates
  useEffect(() => {
    fetchGardenTelemetry();
  }, [fetchGardenTelemetry]);

  return (
    <div className="space-y-8 max-w-7xl w-full mx-auto flex-grow flex flex-col justify-start">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex-shrink-0 font-sans">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight animate-fade-in">Xin chào, {user?.name || 'Caretaker'}!</h2>
            <p className="text-green-100 text-sm max-w-lg">
              Hệ thống đang hiển thị thông số thời gian thực cho: <span className="font-bold underline text-white">{activeGarden.name}</span>.
            </p>
          </div>
          <button 
            onClick={fetchGardenTelemetry} 
            disabled={loading}
            className="self-start md:self-auto flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-xl text-sm font-bold transition duration-200 active:scale-95 disabled:opacity-50"
            aria-label="Refresh telemetry data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới dữ liệu</span>
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

      {loading ? (
        // Loading animation skeleton
        <div className="flex-grow flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-green-600" />
          <p className="text-sm font-bold text-slate-500 font-sans">Đang tải dữ liệu vườn từ mock API...</p>
        </div>
      ) : (
        <>
          {/* ROW 1: Sensor Cards (Temperature, Humidity, Light) */}
          <section aria-labelledby="sensors-heading" className="flex-shrink-0 font-sans">
            <h2 id="sensors-heading" className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Thông số cảm biến</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Temperature Card */}
              <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nhiệt độ</p>
                  <h3 className="text-3xl font-black text-slate-800">{sensors.temp.toFixed(1)} <span className="text-xl font-bold text-slate-400">°C</span></h3>
                  <p className="text-[10px] text-red-500/80 font-medium">Ngưỡng tối ưu: 20°C - 28°C</p>
                </div>
                <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl">
                  <Thermometer className="w-8 h-8" />
                </div>
              </div>

              {/* Humidity Card */}
              <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Độ ẩm đất</p>
                  <h3 className="text-3xl font-black text-slate-800">{sensors.humidity.toFixed(1)} <span className="text-xl font-bold text-slate-400">%</span></h3>
                  <p className="text-[10px] text-blue-500/80 font-medium">Ngưỡng tối ưu: 50% - 70%</p>
                </div>
                <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl">
                  <Droplets className="w-8 h-8" />
                </div>
              </div>

              {/* Light Intensity Card */}
              <div className="bg-white border border-slate-100/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cường độ sáng</p>
                  <h3 className="text-3xl font-black text-slate-800">{sensors.light.toLocaleString()} <span className="text-xl font-bold text-slate-400">Lux</span></h3>
                  <p className="text-[10px] text-amber-500/80 font-medium">Ngưỡng tối ưu: &gt; 1000 Lux</p>
                </div>
                <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl">
                  <Sun className="w-8 h-8" />
                </div>
              </div>

            </div>
          </section>

          {/* ROW 2: Device Controls */}
          <section aria-labelledby="controls-heading" className="flex-shrink-0 font-sans">
            <h2 id="controls-heading" className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Điều khiển thiết bị</h2>
            <DeviceControl gardenId={currentGardenId} />
          </section>

          {/* ROW 3: History Chart (Temperature & Humidity 24h trends) */}
          <section aria-labelledby="history-heading" className="flex-grow flex flex-col min-h-[380px] font-sans">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col flex-grow space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-shrink-0">
                <div>
                  <h2 id="history-heading" className="text-lg font-bold text-slate-900">Biểu đồ xu hướng 24h</h2>
                  <p className="text-xs text-slate-500">Thông số nhiệt độ và độ ẩm trong 24 giờ qua</p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Dữ liệu thời gian thực</span>
                </div>
              </div>
              
              {/* Line Chart View */}
              <div className="w-full flex-grow pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={history}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="time" 
                      tickLine={false} 
                      axisLine={false} 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      dy={10}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      stroke="#94a3b8" 
                      fontSize={11}
                      dx={-10}
                    />
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
                      wrapperStyle={{ 
                        fontSize: '13px', 
                        fontWeight: 600,
                        paddingBottom: '10px'
                      }}
                    />
                    <Line 
                      name="Nhiệt độ (°C)" 
                      type="monotone" 
                      dataKey="Temperature" 
                      stroke="#f43f5e" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      name="Độ ẩm đất (%)" 
                      type="monotone" 
                      dataKey="Humidity" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}

    </div>
  );
}
