import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  Fan, 
  Lightbulb, 
  RefreshCw, 
  AlertCircle,
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';

/**
 * Custom Hardware Rocker Switch Component
 */
const HardwareSwitch = ({ label, icon: Icon, active, onToggle, activeColor, isLoading }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-44 transition-all duration-300 hover:shadow-md hover:border-slate-200">
      {/* Label and Status */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${active ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-700 text-sm tracking-tight">{label}</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-full">
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${active ? `${activeColor} shadow-[0_0_8px_currentColor] animate-pulse` : 'bg-slate-300'}`}></span>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">{active ? 'ON' : 'OFF'}</span>
        </div>
      </div>
      
      {/* Physical-style Rocker Switch */}
      <div className="flex justify-center mt-3">
        <button 
          onClick={onToggle}
          disabled={isLoading}
          className={`w-14 h-20 bg-slate-200 border border-slate-300 rounded-xl p-1 shadow-inner relative flex flex-col justify-between focus:outline-none transition-all ${
            isLoading ? 'opacity-65 cursor-wait' : 'cursor-pointer'
          }`}
          aria-label={`Toggle ${label}`}
        >
          {/* Bevel markers inside the switch housing */}
          <div className="absolute inset-x-2 top-2 h-0.5 bg-slate-400/30 rounded"></div>
          <div className="absolute inset-x-2 bottom-2 h-0.5 bg-slate-400/30 rounded"></div>
          
          {/* Moving Rocker Lever */}
          <div 
            className={`w-12 h-10 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center font-black text-[10px] tracking-wide select-none
              ${active 
                ? 'bg-gradient-to-b from-green-500 to-emerald-600 text-white translate-y-8 shadow-[0_-2px_4px_rgba(0,0,0,0.15)] border-t border-green-400' 
                : 'bg-gradient-to-b from-slate-100 to-slate-300 text-slate-500 translate-y-0 shadow-[0_2px_4px_rgba(0,0,0,0.15)] border-b border-slate-400'
              }`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            ) : active ? 'ON' : 'OFF'}
          </div>
        </button>
      </div>
    </div>
  );
};

export default function DeviceControl({ gardenId }) {
  const { currentGardenId } = useAuth();
  const activeGardenId = gardenId || currentGardenId;

  // States for device relays
  const [pumpActive, setPumpActive] = useState(false);
  const [fanActive, setFanActive] = useState(false);
  const [lightActive, setLightActive] = useState(true);

  // Spinner states for switches
  const [togglingDevice, setTogglingDevice] = useState({ pump: false, fan: false, light: false });

  // Self-contained micro toast state
  const [toast, setToast] = useState({ message: null, visible: false });

  // Auto-hide toast notification
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (message) => {
    setToast({ message, visible: true });
  };

  /**
   * Handle device command sending with optimistic state switches and rollback capability.
   */
  const handleToggle = async (deviceName, deviceKey, deviceId, currentStatus, setStatusAction) => {
    setTogglingDevice(prev => ({ ...prev, [deviceKey]: true }));
    const targetStatus = !currentStatus;

    // Optimistically update client UI state
    setStatusAction(targetStatus);

    try {
      await apiService.toggleDevice(deviceId, targetStatus ? 'ON' : 'OFF');
    } catch (err) {
      console.error(`Error toggling device ${deviceId}:`, err);
      // Revert status on backend failure
      setStatusAction(currentStatus);
      showToast(`Không thể kết nối đến thiết bị "${deviceName}". Lệnh điều khiển thất bại.`);
    } finally {
      setTogglingDevice(prev => ({ ...prev, [deviceKey]: false }));
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Self-contained Toast Notification Layer */}
      {toast.visible && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl p-4 flex items-start space-x-3 animate-fade-in font-sans">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Lỗi điều khiển thiết bị</p>
            <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="text-slate-500 hover:text-white rounded-lg p-1 transition"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid of hardware switches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HardwareSwitch 
          label="Water Pump" 
          icon={Droplet} 
          active={pumpActive} 
          isLoading={togglingDevice.pump}
          onToggle={() => handleToggle("Water Pump", "pump", `${activeGardenId}-pump`, pumpActive, setPumpActive)} 
          activeColor="text-blue-500" 
        />
        <HardwareSwitch 
          label="Cooling Fan" 
          icon={Fan} 
          active={fanActive} 
          isLoading={togglingDevice.fan}
          onToggle={() => handleToggle("Cooling Fan", "fan", `${activeGardenId}-fan`, fanActive, setFanActive)} 
          activeColor="text-teal-500" 
        />
        <HardwareSwitch 
          label="Growth Lighting" 
          icon={Lightbulb} 
          active={lightActive} 
          isLoading={togglingDevice.light}
          onToggle={() => handleToggle("Growth Lighting", "light", `${activeGardenId}-light`, lightActive, setLightActive)} 
          activeColor="text-amber-500" 
        />
      </div>
    </div>
  );
}
