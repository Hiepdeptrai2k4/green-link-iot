import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  AlertCircle, 
  Link,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw
} from 'lucide-react';
import apiService from '../services/api';

export default function AdminDevices() {
  const [devicesList, setDevicesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceSearch, setDeviceSearch] = useState('');

  // Form State for Device Registration
  const [newDevice, setNewDevice] = useState({
    deviceId: '',
    deviceName: '',
    userId: ''
  });
  const [registeringDevice, setRegisteringDevice] = useState(false);

  // Modal State for Editing
  const [editingDevice, setEditingDevice] = useState(null);
  const [updatingDevice, setUpdatingDevice] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devicesRes, usersRes] = await Promise.all([
        apiService.getAdminDevices(),
        apiService.getAdminUsers()
      ]);
      const devicesData = devicesRes && devicesRes.data !== undefined ? devicesRes.data : devicesRes;
      const usersData = usersRes && usersRes.data !== undefined ? usersRes.data : usersRes;

      setDevicesList(Array.isArray(devicesData) ? devicesData : []);
      setUsersList(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to load device management data:', err);
      setError('Không thể kết nối đến máy chủ API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi đăng ký thiết bị.');
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleConnectDevice = async (deviceId) => {
    try {
      await apiService.connectDevice(deviceId);
      setDevicesList(prev => prev.map(d => d.deviceId === deviceId ? { ...d, status: true } : d));
      alert(`Đã kết nối và kích hoạt đường truyền cho thiết bị ${deviceId}!`);
    } catch (err) {
      console.error(err);
      alert('Không thể kích hoạt kết nối thiết bị.');
    }
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa liên kết thiết bị "${deviceName}" (${deviceId})?`)) {
      try {
        await apiService.deleteDevice(deviceId);
        alert('Xóa thiết bị thành công!');
        await loadData();
      } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa thiết bị.');
      }
    }
  };

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
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi cập nhật thông tin thiết bị.');
    } finally {
      setUpdatingDevice(false);
    }
  };

  const filteredDevices = devicesList.filter(d => 
    d.deviceId.toLowerCase().includes(deviceSearch.toLowerCase()) ||
    d.deviceName.toLowerCase().includes(deviceSearch.toLowerCase()) ||
    (d.user?.fullName 
      ? d.user.fullName.toLowerCase().includes(deviceSearch.toLowerCase())
      : "chưa gán".includes(deviceSearch.toLowerCase()) || "chua gan".includes(deviceSearch.toLowerCase())
    )
  );

  const formatLastSeen = (isoString) => {
    if (!isoString || isoString === 'Chưa nhận tin') return 'Chưa có tín hiệu';
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
              <Cpu className="w-6 h-6 text-indigo-400" />
              <h1 className="text-2xl md:text-3xl font-black tracking-tight font-sans">Quản lý Thiết Bị</h1>
            </div>
            <p className="text-slate-300 text-sm">Quản lý toàn bộ mạch vi điều khiển ESP32, kiểm soát cấp quyền vườn cây.</p>
          </div>
          <button 
            onClick={loadData}
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

      {loading ? (
        <div className="py-20 text-center font-bold text-slate-400">Đang đồng bộ dữ liệu thiết bị...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Device form (1 col) */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-900">Đăng ký thiết bị mới</h2>
                  <p className="text-xs text-slate-500">Khởi tạo ID cho vi điều khiển ESP32</p>
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
                    placeholder="Ví dụ: Vườn Sầu Riêng"
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

          {/* Devices List Table (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Danh sách mạch phần cứng</h2>
                <p className="text-xs text-slate-500">Giám sát, duyệt kích hoạt, sửa đổi hoặc xóa liên kết</p>
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
              <div className="py-20 text-center text-slate-400 text-sm font-medium">Chưa có thiết bị nào được đăng ký.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-4">Mã Thiết Bị</th>
                      <th className="pb-3 px-4">Tên Vườn</th>
                      <th className="pb-3 px-4">Người Sở Hữu</th>
                      <th className="pb-3 px-4">Trạng Thái Duyệt</th>
                      <th className="pb-3 px-4">Trạng Thái ESP32</th>
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
                                  Lần cuối: {formatLastSeen(device.lastSeen)}
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
                                  title="Phê duyệt kết nối vườn"
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
                                title="Sửa thiết bị"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteDevice(device.deviceId, device.deviceName)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition active:scale-90"
                                title="Xóa liên kết"
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
                <label className="block text-xs font-bold text-slate-400 uppercase">Mã thiết bị (Device ID - Không thể sửa)</label>
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
                <label className="block text-xs font-bold text-slate-400 uppercase font-sans">Trạng thái duyệt</label>
                <select
                  value={editingDevice.status ? 'true' : 'false'}
                  onChange={e => setEditingDevice(prev => ({ ...prev, status: e.target.value === 'true' }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-600 text-sm cursor-pointer font-semibold"
                >
                  <option value="true">ACTIVE (Kích hoạt)</option>
                  <option value="false">PENDING (Chờ duyệt)</option>
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
