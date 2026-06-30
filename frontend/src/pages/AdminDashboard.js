import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  UserPlus, 
  Activity, 
  AlertCircle, 
  Link,
  Edit,
  Trash2,
  User,
  Search,
  X,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Power,
  CheckCircle
} from 'lucide-react';
import apiService from '../services/api';

export default function AdminDashboard() {
  const [usersList, setUsersList] = useState([]);
  const [devicesList, setDevicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab State: 'devices' or 'users'
  const [activeTab, setActiveTab] = useState('devices');

  // Search States
  const [deviceSearch, setDeviceSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');



  // Form State for Device Registration
  const [newDevice, setNewDevice] = useState({
    deviceId: '',
    deviceName: '',
    userId: ''
  });
  const [registeringDevice, setRegisteringDevice] = useState(false);

  // Modal States for Editing
  const [editingUser, setEditingUser] = useState(null); // holds user object being edited
  const [updatingUser, setUpdatingUser] = useState(false);

  const [editingDevice, setEditingDevice] = useState(null); // holds device object being edited
  const [updatingDevice, setUpdatingDevice] = useState(false);

  // Load Admin Data on Mount
  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, devicesRes] = await Promise.all([
        apiService.getAdminUsers(),
        apiService.getAdminDevices()
      ]);
      
      const usersData = usersRes && usersRes.data !== undefined ? usersRes.data : usersRes;
      const devicesData = devicesRes && devicesRes.data !== undefined ? devicesRes.data : devicesRes;

      setUsersList(Array.isArray(usersData) ? usersData : []);
      setDevicesList(Array.isArray(devicesData) ? devicesData : []);
    } catch (err) {
      console.error('Failed to load admin management data:', err);
      setError('Không thể kết nối đến máy chủ API quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);



  // Submit Device Registration
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.deviceId.trim() || !newDevice.deviceName.trim()) {
      alert('Vui lòng điền mã thiết bị và tên khu vườn!');
      return;
    }

    setRegisteringDevice(true);
    try {
      await apiService.registerDevice(newDevice);
      alert('Đăng ký thiết bị phần cứng thành công (Chờ kết nối)!');
      setNewDevice({ deviceId: '', deviceName: '', userId: '' });
      await loadAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi đăng ký thiết bị.');
    } finally {
      setRegisteringDevice(false);
    }
  };

  // Device Connection Activation Action
  const handleConnectDevice = async (deviceId) => {
    try {
      await apiService.connectDevice(deviceId);
      // Toggle device status locally in state
      setDevicesList(prev => prev.map(d => d.deviceId === deviceId ? { ...d, status: true } : d));
      alert(`Đã kết nối và kích hoạt đường truyền cho thiết bị ${deviceId}!`);
    } catch (err) {
      console.error(err);
      alert('Không thể kích hoạt kết nối thiết bị.');
    }
  };

  // User Deletion
  const handleDeleteUser = async (userId, userFullName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${userFullName}"? LƯU Ý: Tất cả thiết bị thuộc sở hữu của người dùng này cũng sẽ bị xóa khỏi cơ sở dữ liệu!`)) {
      try {
        await apiService.deleteUserAccount(userId);
        alert('Xóa người dùng thành công!');
        await loadAdminData();
      } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa người dùng.');
      }
    }
  };

  // User Update Submit
  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser.fullName.trim() || !editingUser.username.trim()) {
      alert('Vui lòng điền đầy đủ thông tin hiển thị và email!');
      return;
    }

    setUpdatingUser(true);
    try {
      await apiService.updateUserAccount(editingUser.id, {
        fullName: editingUser.fullName,
        username: editingUser.username,
        role: editingUser.role,
        password: editingUser.password, // Optional, backend ignores if blank
        email: editingUser.email,
        phoneNumber: editingUser.phoneNumber,
        telegramChatId: editingUser.telegramChatId
      });
      alert('Cập nhật thông tin người dùng thành công!');
      setEditingUser(null);
      await loadAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi cập nhật thông tin người dùng.');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Device Deletion
  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa liên kết thiết bị "${deviceName}" (${deviceId})?`)) {
      try {
        await apiService.deleteDevice(deviceId);
        alert('Xóa thiết bị thành công!');
        await loadAdminData();
      } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa thiết bị.');
      }
    }
  };

  // Device Update Submit
  const handleUpdateDeviceSubmit = async (e) => {
    e.preventDefault();
    if (!editingDevice.deviceName.trim()) {
      alert('Vui lòng điền tên vườn!');
      return;
    }

    setUpdatingDevice(true);
    try {
      await apiService.updateDeviceDetails(editingDevice.deviceId, {
        deviceName: editingDevice.deviceName,
        status: editingDevice.status,
        userId: editingDevice.userId ? parseInt(editingDevice.userId) : 0
      });
      alert('Cập nhật thông tin thiết bị thành công!');
      setEditingDevice(null);
      await loadAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi cập nhật thông tin thiết bị.');
    } finally {
      setUpdatingDevice(false);
    }
  };

  // Filter lists based on search inputs
  const filteredDevices = devicesList.filter(d => 
    d.deviceId.toLowerCase().includes(deviceSearch.toLowerCase()) ||
    d.deviceName.toLowerCase().includes(deviceSearch.toLowerCase()) ||
    (d.user?.fullName 
      ? d.user.fullName.toLowerCase().includes(deviceSearch.toLowerCase())
      : "chưa gán".includes(deviceSearch.toLowerCase()) || "chua gan".includes(deviceSearch.toLowerCase())
    )
  );

  const filteredUsers = usersList.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Chưa rõ';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const formatLastSeen = (isoString) => {
    if (!isoString || isoString === 'Chưa nhận tin') return 'Chưa có tin';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-indigo-400" />
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Green Link IOT Admin Panel</h1>
            </div>
            <p className="text-slate-300 text-sm">Cổng kiểm soát cấp phát tài khoản nông dân và kích hoạt đường truyền thiết bị ESP32.</p>
          </div>
          <button 
            onClick={loadAdminData}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl transition duration-200 text-sm border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center space-x-3 text-rose-800 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Stat 1: Total Users */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Tổng người dùng</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{usersList.length}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-650 rounded-xl">
              <User className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 2: Active Devices */}
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-100/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Thiết bị đã duyệt</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1 font-sans">
                {devicesList.filter(d => d.status === true).length}
              </h3>
            </div>
            <div className="p-3 bg-green-500/10 text-green-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 3: Pending Devices */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider font-sans">Mạch chờ duyệt</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {devicesList.filter(d => d.status !== true).length}
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <Link className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 4: Hardware Online */}
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border border-cyan-100/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-500 uppercase tracking-wider font-sans">Vườn đang chạy trên Broker</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {devicesList.filter(d => d.isOnline === true).length}
              </h3>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-xl">
              <Power className={`w-6 h-6 ${devicesList.some(d => d.isOnline) ? 'animate-pulse' : ''}`} />
            </div>
          </div>
        </div>
      )}

      {/* Modern Sleek Tabs */}
      <div className="flex border-b border-slate-200/80">
        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center space-x-2 pb-4 px-6 font-bold text-sm border-b-2 transition duration-250 ${
            activeTab === 'devices'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Danh sách Thiết bị ({devicesList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 pb-4 px-6 font-bold text-sm border-b-2 transition duration-250 ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Quản lý Người dùng ({usersList.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center font-bold text-slate-400">Đang đồng bộ dữ liệu quản trị...</div>
      ) : (
        <div className="space-y-8">
          
          {/* TAB 1: DEVICE MANAGEMENT */}
          {activeTab === 'devices' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form panel: Register Device (1 col) */}
              <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-md font-bold text-slate-900">Đăng ký thiết bị phần cứng</h2>
                      <p className="text-xs text-slate-500">Liên kết mã vi điều khiển ESP32 với chủ sở hữu</p>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterDevice} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Mã thiết bị (Device ID)</label>
                      <input 
                        type="text"
                        placeholder="Ví dụ: User_Hiep_03"
                        value={newDevice.deviceId}
                        onChange={e => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Tên khu vườn</label>
                      <input 
                        type="text"
                        placeholder="Ví dụ: Vườn Cam"
                        value={newDevice.deviceName}
                        onChange={e => setNewDevice(prev => ({ ...prev, deviceName: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Nông dân sở hữu</label>
                      <select
                        value={newDevice.userId}
                        onChange={e => setNewDevice(prev => ({ ...prev, userId: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-600 text-sm cursor-pointer font-semibold"
                      >
                        <option value="">-- Chưa liên kết / Chờ gán --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={registeringDevice}
                      className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition duration-200 text-sm disabled:opacity-50 active:scale-95"
                    >
                      {registeringDevice ? 'Đang liên kết...' : 'Liên kết thiết bị'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Table panel: List Devices (2 cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                
                {/* Table Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Danh sách thiết bị liên kết</h2>
                    <p className="text-xs text-slate-500">Giám sát, kích hoạt trạng thái, sửa đổi hoặc xóa thiết bị</p>
                  </div>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      type="text"
                      placeholder="Tìm ID, tên vườn, nông dân..."
                      value={deviceSearch}
                      onChange={e => setDeviceSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-xs font-semibold"
                    />
                  </div>
                </div>

                {filteredDevices.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-medium">Chưa có thiết bị nào khớp với tìm kiếm.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3 px-4">Mã Thiết Bị</th>
                          <th className="pb-3 px-4">Tên Vườn</th>
                          <th className="pb-3 px-4">Người Sở Hữu</th>
                          <th className="pb-3 px-4">Duyệt Web</th>
                          <th className="pb-3 px-4">Kết Nối ESP32</th>
                          <th className="pb-3 px-4 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredDevices.map((device) => {
                          const isActive = device.status === true;
                          return (
                            <tr key={device.deviceId} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 px-4 font-mono font-bold text-slate-700">{device.deviceId}</td>
                              <td className="py-4 px-4 font-bold text-slate-800">{device.deviceName}</td>
                              <td className="py-4 px-4 text-slate-500">
                                <span className="font-semibold text-slate-700">{device.user?.fullName || 'Chưa gán'}</span>
                                <span className="block text-[11px] text-slate-400 font-mono">{device.user?.username || 'N/A'}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${
                                  isActive 
                                    ? 'bg-green-50 text-green-700 border-green-100' 
                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                                  <span>{isActive ? 'ACTIVE' : 'PENDING'}</span>
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {device.isOnline ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                                    <span>ONLINE</span>
                                  </span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1" />
                                      <span>OFFLINE</span>
                                    </span>
                                    <span className="block text-[9px] text-slate-400 font-medium">
                                      {formatLastSeen(device.lastSeen)}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {!isActive && (
                                    <button
                                      onClick={() => handleConnectDevice(device.deviceId)}
                                      className="inline-flex items-center space-x-1 bg-amber-400 hover:bg-amber-500 text-amber-950 px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shadow-sm"
                                      title="Kích hoạt vườn này cho Farmer"
                                    >
                                      <Link className="w-3.5 h-3.5" />
                                      <span>Connect</span>
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => setEditingDevice({
                                      deviceId: device.deviceId,
                                      deviceName: device.deviceName,
                                      status: device.status,
                                      userId: device.user?.id || ''
                                    })}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition active:scale-90"
                                    title="Chỉnh sửa thông tin thiết bị"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteDevice(device.deviceId, device.deviceName)}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition active:scale-90"
                                    title="Xóa liên kết thiết bị"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: USER ACCOUNT MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 gap-8">
              
              {/* Table panel: List Users (Full Width) */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                
                {/* Table Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Danh sách tài khoản hệ thống</h2>
                    <p className="text-xs text-slate-500">Giám sát thông tin người dùng, đổi phân quyền hoặc xóa tài khoản</p>
                  </div>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input 
                      type="text"
                      placeholder="Tìm họ tên, email, vai trò..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-indigo-500 text-xs font-semibold"
                    />
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-medium">Chưa có người dùng nào khớp với tìm kiếm.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          <th className="pb-3 px-4">Họ Tên</th>
                          <th className="pb-3 px-4">Tài Khoản (Gmail)</th>
                          <th className="pb-3 px-4">Email</th>
                          <th className="pb-3 px-4">Số Điện Thoại</th>
                          <th className="pb-3 px-4">Vai Trò</th>
                          <th className="pb-3 px-4">Telegram Chat ID</th>
                          <th className="pb-3 px-4">Ngày Tạo</th>
                          <th className="pb-3 px-4 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredUsers.map((item) => {
                          const isAdmin = item.role === 'ADMIN';
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 px-4 font-bold text-slate-800 flex items-center space-x-2">
                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <span>{item.fullName}</span>
                              </td>
                              <td className="py-4 px-4 font-semibold text-slate-600">{item.username}</td>
                              <td className="py-4 px-4 text-xs font-semibold text-slate-500">{item.email || <span className="text-slate-300 font-medium">N/A</span>}</td>
                              <td className="py-4 px-4 text-xs font-semibold text-slate-500">{item.phoneNumber || <span className="text-slate-300 font-medium">Trống</span>}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${
                                  isAdmin 
                                    ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                  {isAdmin ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                  <span>{item.role}</span>
                                </span>
                              </td>
                              <td className="py-4 px-4 font-semibold text-slate-500 text-xs">{item.telegramChatId || <span className="text-slate-300 font-medium">Chưa liên kết</span>}</td>
                              <td className="py-4 px-4 text-slate-400 text-xs font-medium">
                                <span className="inline-flex items-center space-x-1.5">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{formatTimestamp(item.createdAt)}</span>
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => setEditingUser({
                                      id: item.id,
                                      fullName: item.fullName,
                                      username: item.username,
                                      role: item.role,
                                      password: '',
                                      email: item.email || '',
                                      phoneNumber: item.phoneNumber || '',
                                      telegramChatId: item.telegramChatId || ''
                                    })}
                                    className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition active:scale-90"
                                    title="Chỉnh sửa tài khoản"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(item.id, item.fullName)}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition active:scale-90"
                                    title="Xóa tài khoản"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative font-sans space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md font-bold text-slate-950">Chỉnh sửa thông tin tài khoản</h3>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Tên hiển thị</label>
                <input 
                  type="text"
                  value={editingUser.fullName}
                  onChange={e => setEditingUser(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Địa chỉ Gmail (Tên đăng nhập)</label>
                <input 
                  type="email"
                  value={editingUser.username}
                  onChange={e => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Email liên hệ (Tùy chọn)</label>
                <input 
                  type="email"
                  placeholder="lienhe@gmail.com"
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Số điện thoại (Tùy chọn)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={editingUser.phoneNumber || ''}
                  onChange={e => setEditingUser(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Đổi mật khẩu (Bỏ trống nếu giữ nguyên)</label>
                <input 
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={editingUser.password}
                  onChange={e => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Mã Telegram Chat ID (Tùy chọn)</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: 123456789"
                  value={editingUser.telegramChatId || ''}
                  onChange={e => setEditingUser(prev => ({ ...prev, telegramChatId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Vai trò hệ thống</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm cursor-pointer font-semibold"
                >
                  <option value="USER">USER (Farmer)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={updatingUser}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-950/20 active:scale-95 transition disabled:opacity-50 text-sm"
              >
                {updatingUser ? 'Đang cập nhật...' : 'Cập nhật tài khoản'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DEVICE */}
      {editingDevice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 relative font-sans space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md font-bold text-slate-950">Chỉnh sửa thông tin thiết bị</h3>
              </div>
              <button 
                onClick={() => setEditingDevice(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDeviceSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Mã thiết bị (Device ID - Khóa chính)</label>
                <input 
                  type="text"
                  value={editingDevice.deviceId}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 outline-none cursor-not-allowed"
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Tên khu vườn</label>
                <input 
                  type="text"
                  value={editingDevice.deviceName}
                  onChange={e => setEditingDevice(prev => ({ ...prev, deviceName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">Nông dân sở hữu</label>
                <select
                  value={editingDevice.userId}
                  onChange={e => setEditingDevice(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm cursor-pointer font-semibold"
                >
                  <option value="">-- Chưa liên kết / Chờ gán --</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase font-sans">Trạng thái kết nối</label>
                <select
                  value={editingDevice.status ? 'true' : 'false'}
                  onChange={e => setEditingDevice(prev => ({ ...prev, status: e.target.value === 'true' }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm cursor-pointer font-semibold"
                >
                  <option value="true">ACTIVE (Kích hoạt)</option>
                  <option value="false">PENDING (Chờ phê duyệt)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={updatingDevice}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-950/20 active:scale-95 transition disabled:opacity-50 text-sm"
              >
                {updatingDevice ? 'Đang cập nhật...' : 'Cập nhật thiết bị'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
