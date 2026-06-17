import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  AlertCircle, 
  Edit,
  Trash2,
  User,
  Search,
  X,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import apiService from '../services/api';

export default function AdminUsers() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  // Form State for User Account Creation
  const [newUser, setNewUser] = useState({
    fullName: '',
    username: '', // Gmail address
    password: '',
    role: 'USER'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Modal State for Editing
  const [editingUser, setEditingUser] = useState(null);
  const [updatingUser, setUpdatingUser] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await apiService.getAdminUsers();
      const usersData = usersRes && usersRes.data !== undefined ? usersRes.data : usersRes;
      setUsersList(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to load user management data:', err);
      setError('Không thể kết nối đến máy chủ API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.fullName.trim() || !newUser.username.trim() || !newUser.password.trim()) {
      alert('Vui lòng điền đầy đủ thông tin tài khoản!');
      return;
    }

    setCreatingUser(true);
    try {
      await apiService.createUserAccount(newUser);
      alert('Tạo tài khoản nông dân thành công!');
      setNewUser({ fullName: '', username: '', password: '', role: 'USER' });
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi tạo tài khoản người dùng.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId, userFullName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${userFullName}"? LƯU Ý: Tất cả thiết bị thuộc sở hữu của người dùng này cũng sẽ bị xóa khỏi cơ sở dữ liệu!`)) {
      try {
        await apiService.deleteUserAccount(userId);
        alert('Xóa người dùng thành công!');
        await loadData();
      } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa người dùng.');
      }
    }
  };

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
        password: editingUser.password
      });
      alert('Cập nhật thông tin người dùng thành công!');
      setEditingUser(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi cập nhật thông tin người dùng.');
    } finally {
      setUpdatingUser(false);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-indigo-400" />
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Quản lý Người Dùng</h1>
            </div>
            <p className="text-slate-300 text-sm">Cấp phát tài khoản đăng nhập, sửa đổi phân quyền hoặc xóa người dùng khỏi hệ thống.</p>
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
        <div className="py-20 text-center font-bold text-slate-400">Đang đồng bộ dữ liệu người dùng...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add User form (1 col) */}
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-900">Cấp tài khoản mới</h2>
                  <p className="text-xs text-slate-500">Tạo tài khoản Farmer hoặc Caretaker mới</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Tên hiển thị</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={newUser.fullName}
                    onChange={e => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Địa chỉ Gmail</label>
                  <input 
                    type="email"
                    placeholder="nongdan@gmail.com"
                    value={newUser.username}
                    onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Mật khẩu ban đầu</label>
                  <input 
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={newUser.password}
                    onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Vai trò quản trị</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm cursor-pointer font-semibold"
                  >
                    <option value="USER">USER (Farmer)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition duration-200 text-sm disabled:opacity-50 active:scale-95"
                >
                  {creatingUser ? 'Đang khởi tạo...' : 'Tạo tài khoản'}
                </button>
              </form>
            </div>
          </div>

          {/* Users List Table (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Danh sách tài khoản hệ thống</h2>
                <p className="text-xs text-slate-500">Giám sát tài khoản, chỉnh sửa hoặc xóa thông tin người dùng</p>
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
                      <th className="pb-3 px-4">Vai Trò</th>
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
                                  password: ''
                                })}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition active:scale-90"
                                title="Sửa tài khoản"
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
                className="w-full mt-4 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-950/20 active:scale-95 transition disabled:opacity-50 text-sm"
              >
                {updatingUser ? 'Đang cập nhật...' : 'Cập nhật tài khoản'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
