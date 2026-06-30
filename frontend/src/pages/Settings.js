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
  ToggleRight,
  Edit,
  Lock,
  Bell,
  BellOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

export default function SettingsPage() {
  const { user, currentGardenId, gardens, updateUserInfo } = useAuth();
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

  // Telegram Config State
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);

  // Profile Config State
  const [fullName, setFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Garden Telegram Alerts Toggle State
  const [telegramAlertsEnabled, setTelegramAlertsEnabled] = useState(true);
  const [togglingAlerts, setTogglingAlerts] = useState(false);

  // Garden Rename State
  const [gardenName, setGardenName] = useState('');
  const [renamingGarden, setRenamingGarden] = useState(false);

  const activeGarden = gardens.find(g => (g.deviceId || g.id)?.toString() === currentGardenId?.toString()) || gardens[0];

  // Sync gardenName and telegramAlertsEnabled only when activeGarden changes and garden ID changes
  const [lastGardenId, setLastGardenId] = useState('');

  useEffect(() => {
    if (activeGarden && (currentGardenId?.toString() !== lastGardenId?.toString())) {
      setGardenName(activeGarden.deviceName || activeGarden.name || '');
      setTelegramAlertsEnabled(activeGarden.telegramAlertsEnabled !== false);
      setLastGardenId(currentGardenId?.toString() || '');
    }
  }, [activeGarden, currentGardenId, lastGardenId]);

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
      setError('Không thể tải cấu hình ngưỡng hoặc danh sách hẹn giờ.');
    } finally {
      setLoading(false);
    }
  }, [currentGardenId]);

  // Load user profile once on mount / login
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.email) return;
      try {
        const profileRes = await apiService.getUserProfile(user.email);
        const profileData = profileRes && profileRes.data !== undefined ? profileRes.data : profileRes;
        if (profileData) {
          setTelegramChatId(profileData.telegramChatId || '');
          setFullName(profileData.fullName || '');
          setUserEmail(profileData.email || '');
          setPhoneNumber(profileData.phoneNumber || '');
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    loadProfile();
  }, [user?.email]);

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

  const handleRenameGarden = async (e) => {
    e.preventDefault();
    if (!currentGardenId || !gardenName.trim()) return;
    setRenamingGarden(true);
    try {
      await apiService.renameGarden(currentGardenId, gardenName.trim());
      alert('Đổi tên vườn thành công!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi đổi tên vườn.');
    } finally {
      setRenamingGarden(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.email) return;
    setSavingTelegram(true);
    try {
      await apiService.updateUserProfile(user.email, { 
        fullName, 
        email: userEmail, 
        phoneNumber, 
        telegramChatId 
      });
      alert('Cập nhật thông tin cá nhân thành công!');
      // Globally update name and email in context/layouts
      if (updateUserInfo) {
        updateUserInfo({
          name: fullName
        });
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu thông tin cá nhân.');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleToggleTelegramAlerts = async () => {
    if (!currentGardenId) return;
    setTogglingAlerts(true);
    try {
      const nextVal = !telegramAlertsEnabled;
      await apiService.toggleTelegramAlerts(currentGardenId, nextVal);
      setTelegramAlertsEnabled(nextVal);
      alert(`Đã ${nextVal ? 'BẬT' : 'TẮT'} nhận cảnh báo Telegram cho vườn này!`);
      if (activeGarden) {
        activeGarden.telegramAlertsEnabled = nextVal;
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi khi thay đổi trạng thái nhận cảnh báo.');
    } finally {
      setTogglingAlerts(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user?.email) return;
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    setChangingPassword(true);
    try {
      await apiService.changePassword(user.email, currentPassword, newPassword);
      alert('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      const msg = err.response && err.response.data && err.response.data.message 
        ? err.response.data.message 
        : 'Lỗi khi đổi mật khẩu.';
      alert(msg);
    } finally {
      setChangingPassword(false);
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
          
          {/* Left Column: Garden Info & Thresholds (2 cols) */}
          <div className="lg:col-span-2 space-y-8 flex flex-col justify-start">
            
            {/* Garden Info Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Thông tin khu vườn</h2>
                <p className="text-xs text-slate-500">Thay đổi tên hiển thị của khu vườn hiện tại</p>
              </div>
              
              <form onSubmit={handleRenameGarden} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-grow space-y-1.5 w-full">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Tên khu vườn</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Vườn Lan, Vườn Cam..."
                    value={gardenName}
                    onChange={(e) => setGardenName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={renamingGarden}
                  className="sm:w-auto w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50 text-xs shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>{renamingGarden ? 'Đang đổi...' : 'Đổi tên'}</span>
                </button>
              </form>
            </div>

            {/* Threshold Configurations Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
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
                      min="0" 
                      max="100" 
                      value={thresholds.minSoilMoisture} 
                      onChange={e => setThresholds(prev => ({ ...prev, minSoilMoisture: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex items-center justify-between text-xs font-black text-slate-700">
                      <span>0%</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-xl font-bold">{thresholds.minSoilMoisture}%</span>
                      <span>100%</span>
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
                      min="0" 
                      max="60" 
                      value={Math.round(thresholds.maxTemperature)} 
                      onChange={e => setThresholds(prev => ({ ...prev, maxTemperature: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                    <div className="flex items-center justify-between text-xs font-black text-slate-700">
                      <span>0°C</span>
                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl font-bold">{thresholds.maxTemperature}°C</span>
                      <span>60°C</span>
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
        </div>

          {/* Right Column: Schedules & Telegram (1 col) */}
          <div className="lg:col-span-1 space-y-8 flex flex-col">
            
            {/* Timers & Schedule CRUD Cards */}
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
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
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

            {/* Telegram Alerts Toggle Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Cảnh báo Telegram</h2>
                  <p className="text-xs text-slate-500">Bật/Tắt thông báo cảnh báo cho vườn này</p>
                </div>
                {telegramAlertsEnabled ? (
                  <Bell className="w-5 h-5 text-green-600 animate-bounce" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-400" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-700">Trạng thái nhận tin</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Áp dụng cho: <span className="font-extrabold text-slate-600">{activeGarden?.deviceName || 'Vườn'}</span></p>
                </div>
                
                <button
                  type="button"
                  onClick={handleToggleTelegramAlerts}
                  disabled={togglingAlerts}
                  className="focus:outline-none transition active:scale-95 text-green-600 disabled:opacity-50"
                >
                  {telegramAlertsEnabled ? (
                    <ToggleRight className="w-9 h-9 text-green-650" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Profile Config Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h2>
                <p className="text-xs text-slate-500">Cấu hình thông tin người dùng và liên kết Telegram</p>
              </div>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Họ và tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Địa chỉ Email</label>
                  <input
                    type="email"
                    placeholder="user@test.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Số điện thoại (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0987654321"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Mã Telegram Chat ID</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={savingTelegram}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-xs shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTelegram ? 'Đang lưu...' : 'Lưu thông tin'}</span>
                </button>
              </form>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed space-y-1">
                <p className="font-bold text-slate-600">Hướng dẫn lấy Chat ID Telegram:</p>
                <p>1. Chat <code>/start</code> với Bot <a href="https://t.me/greenlink_iot_alert_bot" target="_blank" rel="noreferrer" className="text-green-600 font-extrabold hover:underline">@greenlink_iot_alert_bot</a>.</p>
                <p>2. Chat với Bot <strong className="text-slate-600">@userinfobot</strong> để biết mã Chat ID của bạn.</p>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h2>
                <p className="text-xs text-slate-500">Cập nhật mật khẩu đăng nhập tài khoản của bạn</p>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-xs font-semibold text-slate-700"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-xs shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  <span>{changingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</span>
                </button>
              </form>
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
