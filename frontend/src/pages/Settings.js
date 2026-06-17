import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Save, 
  Trash2, 
  Plus, 
  X, 
  Clock, 
  Droplets, 
  Thermometer, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

export default function SettingsPage() {
  const { currentGardenId, gardens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Threshold Configuration State
  const [thresholds, setThresholds] = useState({
    mode: 'MANUAL',
    minSoilMoisture: 40,
    maxTemperature: 32.0
  });
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Schedules state
  const [schedules, setSchedules] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    actuatorName: 'PUMP',
    startTime: '08:00',
    durationMinutes: 15,
    isActive: true
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const activeGarden = gardens.find(g => (g.deviceId || g.id)?.toString() === currentGardenId?.toString()) || gardens[0];

  // ---- Fetch Configs & Schedules ----
  const loadSettingsData = useCallback(async () => {
    if (!currentGardenId) return;
    setLoading(true);
    setError(null);
    try {
      const [thresholdsRes, schedulesRes] = await Promise.all([
        apiService.getThresholds(currentGardenId),
        apiService.getSchedules(currentGardenId)
      ]);

      const threshData = thresholdsRes && thresholdsRes.data !== undefined ? thresholdsRes.data : thresholdsRes;
      if (threshData) {
        setThresholds({
          mode: threshData.mode || 'MANUAL',
          minSoilMoisture: threshData.minSoilMoisture || 40,
          maxTemperature: threshData.maxTemperature || 32.0
        });
      }

      const schedData = schedulesRes && schedulesRes.data !== undefined ? schedulesRes.data : schedulesRes;
      if (schedData) {
        setSchedules(Array.isArray(schedData) ? schedData : []);
      }
    } catch (err) {
      console.error('Failed to load thresholds or schedules:', err);
      setError('Không thể tải cấu hình cấu hình hoặc danh sách hẹn giờ.');
    } finally {
      setLoading(false);
    }
  }, [currentGardenId]);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  // ---- Save Thresholds ----
  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    if (!currentGardenId) return;
    setSavingThreshold(true);
    try {
      await apiService.updateThresholds(currentGardenId, thresholds);
      alert('Cập nhật cấu hình ngưỡng tự động thành công!');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu cấu hình ngưỡng tự động.');
    } finally {
      setSavingThreshold(false);
    }
  };

  // ---- Toggle Timer Schedule ----
  const handleToggleSchedule = async (scheduleId, currentStatus) => {
    if (!currentGardenId) return;
    try {
      const nextStatus = !currentStatus;
      await apiService.toggleSchedule(currentGardenId, scheduleId, nextStatus);
      // update state
      setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, isActive: nextStatus } : s));
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật trạng thái hẹn giờ.');
    }
  };

  // ---- Delete Schedule ----
  const handleDeleteSchedule = async (scheduleId) => {
    if (!currentGardenId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch hẹn giờ này?')) return;
    
    try {
      await apiService.deleteSchedule(currentGardenId, scheduleId);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      alert('Xóa lịch hẹn giờ thành công!');
    } catch (err) {
      console.error(err);
      alert('Không thể xóa lịch hẹn giờ.');
    }
  };

  // ---- Add Schedule ----
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!currentGardenId) return;
    
    setSubmittingSchedule(true);
    try {
      const res = await apiService.addSchedule(currentGardenId, newSchedule);
      const addedData = res && res.data !== undefined ? res.data : res;
      if (addedData && addedData.id) {
        setSchedules(prev => [...prev, addedData]);
      } else {
        // Fallback refresh
        const freshRes = await apiService.getSchedules(currentGardenId);
        const freshData = freshRes && freshRes.data !== undefined ? freshRes.data : freshRes;
        if (freshData) setSchedules(Array.isArray(freshData) ? freshData : []);
      }
      alert('Thêm lịch hẹn giờ mới thành công!');
      setShowAddModal(false);
      setNewSchedule({ actuatorName: 'PUMP', startTime: '08:00', durationMinutes: 15, isActive: true });
    } catch (err) {
      console.error(err);
      alert('Lỗi khi thêm lịch hẹn giờ mới.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const getActuatorLabel = (name) => {
    const uppercase = name.toUpperCase();
    if (uppercase === 'PUMP') return 'Máy bơm tưới nước';
    if (uppercase === 'FAN') return 'Quạt thông gió';
    if (uppercase === 'LED' || uppercase === 'LIGHT') return 'Đèn LED chiếu sáng';
    return name;
  };

  if (!currentGardenId) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto my-20 font-sans">
        <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
          <AlertCircle className="w-16 h-16" />
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
      
      {/* Header banner */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-green-400" />
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Cài đặt hệ thống</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Thiết lập ngưỡng vận hành tự động và lập lịch hẹn giờ cho Đèn, Bơm, Quạt tại <span className="text-green-300 font-extrabold">{activeGarden?.deviceName || 'Vườn'}</span>.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center space-x-3 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center font-bold text-slate-400">Đang tải thông số cấu hình...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Threshold Configurations Card (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Vận hành thông minh (Auto Mode)</h2>
              <p className="text-xs text-slate-500">Thiết lập để vi điều khiển tự động bật/tắt thiết bị khi đạt ngưỡng</p>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-6">
              
              {/* Toggle Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Chế độ hoạt động hiện tại</h3>
                  <p className="text-xs text-slate-500 mt-0.5">AUTO: Tưới/Mát tự động | MANUAL: Điều khiển thủ công</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setThresholds(prev => ({ ...prev, mode: prev.mode === 'AUTO' ? 'MANUAL' : 'AUTO' }))}
                  className="focus:outline-none transition active:scale-95 text-green-600"
                >
                  {thresholds.mode === 'AUTO' ? (
                    <div className="flex items-center space-x-2 bg-green-500/10 px-4 py-2 border border-green-500/20 rounded-xl">
                      <span className="text-xs font-black">TỰ ĐỘNG (AUTO)</span>
                      <ToggleRight className="w-7 h-7 text-green-600" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 bg-slate-200/50 px-4 py-2 border border-slate-300/40 rounded-xl text-slate-600">
                      <span className="text-xs font-black">THỦ CÔNG (MANUAL)</span>
                      <ToggleLeft className="w-7 h-7 text-slate-400" />
                    </div>
                  )}
                </button>
              </div>

              {/* Threshold Sliders (Visible & editable only, deactivated visuals if manual mode is on but editable anyway) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Min Soil Moisture */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  thresholds.mode === 'AUTO' ? 'bg-blue-50/20 border-blue-100' : 'bg-slate-50/40 border-slate-100'
                }`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <h4 className="text-sm font-bold text-slate-800">Độ ẩm đất tối thiểu</h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Dưới ngưỡng này, thiết bị sẽ tự động bật Bơm nước cho đến khi ẩm đất vượt ngưỡng.
                  </p>

                  <div className="space-y-3">
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={thresholds.minSoilMoisture} 
                      onChange={e => setThresholds(prev => ({ ...prev, minSoilMoisture: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex items-center justify-between text-xs font-black text-slate-700">
                      <span>10%</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-xl font-bold">{thresholds.minSoilMoisture}%</span>
                      <span>90%</span>
                    </div>
                  </div>
                </div>

                {/* Max Temperature */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  thresholds.mode === 'AUTO' ? 'bg-amber-50/20 border-amber-100' : 'bg-slate-50/40 border-slate-100'
                }`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-slate-800">Nhiệt độ không khí tối đa</h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Vượt ngưỡng này, quạt hút thông gió sẽ tự khởi động làm mát vườn.
                  </p>

                  <div className="space-y-3">
                    <input 
                      type="range" 
                      min="20" 
                      max="45" 
                      value={Math.round(thresholds.maxTemperature)} 
                      onChange={e => setThresholds(prev => ({ ...prev, maxTemperature: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                    <div className="flex items-center justify-between text-xs font-black text-slate-700">
                      <span>20°C</span>
                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl font-bold">{thresholds.maxTemperature}°C</span>
                      <span>45°C</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingThreshold}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-green-950/20 transition disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingThreshold ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Timers & Schedule CRUD Cards (1 col) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6 flex-grow">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Hẹn giờ hệ thống</h2>
                  <p className="text-xs text-slate-500">Quản lý lịch bật thiết bị cố định trong ngày</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="p-2 bg-green-50 hover:bg-green-100 text-green-600 border border-green-100 rounded-xl transition duration-200"
                  aria-label="Add Schedule"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {schedules.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
                  <Clock className="w-8 h-8 text-slate-300" />
                  <span>Chưa cấu hình lịch đặt hẹn giờ nào.</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {schedules.map((schedule) => {
                    const isEnabled = schedule.isActive === true;
                    return (
                      <div key={schedule.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2 hover:bg-slate-100/50 transition">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-xs text-slate-800">{getActuatorLabel(schedule.actuatorName)}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Chạy lúc <span className="font-bold text-slate-600">{schedule.startTime}</span> trong <span className="font-bold text-slate-600">{schedule.durationMinutes} phút</span>
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleSchedule(schedule.id, schedule.isActive)}
                            className={`p-1.5 rounded-lg border transition ${
                              isEnabled 
                                ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' 
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase px-1">{isEnabled ? 'Hoạt động' : 'Tắt'}</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p><strong>Lưu ý:</strong> Đặt lịch hẹn giờ tưới tiêu sẽ chạy độc lập, bỏ qua kiểm tra tự động của Auto Mode.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Modal: Add New Schedule */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative font-sans space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <h3 className="text-md font-bold text-slate-950">Đặt lịch hẹn giờ mới</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Thiết bị chấp hành</label>
                <select
                  value={newSchedule.actuatorName}
                  onChange={e => setNewSchedule(prev => ({ ...prev, actuatorName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm cursor-pointer font-semibold"
                >
                  <option value="PUMP">MÁY BƠM NƯỚC (PUMP)</option>
                  <option value="LED">ĐÈN CHIẾU SÁNG (LED)</option>
                  <option value="FAN">QUẠT HÚT THÔNG GIÓ (FAN)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Thời gian bắt đầu</label>
                  <input 
                    type="time"
                    value={newSchedule.startTime}
                    onChange={e => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Thời gian chạy (Phút)</label>
                  <input 
                    type="number"
                    min="1"
                    max="1440"
                    value={newSchedule.durationMinutes}
                    onChange={e => setNewSchedule(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 15 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingSchedule}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-950/20 active:scale-95 transition disabled:opacity-50 text-sm"
              >
                {submittingSchedule ? 'Đang tạo lịch...' : 'Lưu lịch hẹn giờ'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
