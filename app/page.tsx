'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  MapPin,
  Map as MapIcon,
  BarChart3,
  List,
  LogOut,
  Globe,
  Activity, 
  Battery, 
  Signal, 
  Thermometer, 
  Cpu, 
  RefreshCw, 
  ChevronRight,
  LayoutGrid,
  History,
  Settings as SettingsIcon,
  AlertCircle,
  Plus,
  Trash2,
  Move,
  Edit3,
  Check,
  X,
  MoreHorizontal,
  Sun,
  Moon,
  Zap,
  Clock,
  ExternalLink,
  Lock,
  Key
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';

// Dynamically import MapSection to avoid SSR issues
const MapSection = dynamic(() => import('../components/MapSection'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-800">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium text-gray-500">Loading Map...</span>
      </div>
    </div>
  )
});

// --- Types ---

interface TileConfig {
  id: string;
  type: 'telemetry' | 'status' | 'selector' | 'refresh' | 'location' | 'all-params';
  title: string;
  key?: string; // For telemetry
  unit?: string;
  icon?: any;
  className: string;
  size: 'small' | 'medium' | 'large' | 'wide';
}

const DEFAULT_TILES: TileConfig[] = [
  { id: 't1', type: 'status', title: 'status', className: 'bg-slate-400 dark:bg-slate-600 text-white', size: 'medium' },
  { id: 't2', type: 'selector', title: 'switch device', className: 'bg-metro-blue text-white', size: 'wide' },
  { id: 't3', type: 'telemetry', title: 'battery', key: 'battery.level', unit: '%', className: 'bg-metro-orange text-white', size: 'small' },
  { id: 't4', type: 'telemetry', title: 'signal', key: 'gsm.signal.level', unit: 'dbm', className: 'bg-metro-cyan text-white', size: 'small' },
  { id: 't5', type: 'location', title: 'location', className: 'bg-metro-violet text-white', size: 'small' },
  { id: 't6', type: 'telemetry', title: 'temp', key: 'can.temperature', unit: '°C', className: 'bg-metro-red text-white', size: 'small' },
  { id: 't7', type: 'all-params', title: 'all params', className: 'bg-metro-orange text-white', size: 'small' },
  { id: 't8', type: 'refresh', title: 'sync', className: 'bg-metro-green text-white', size: 'small' },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    (error as any).info = await res.json();
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

// --- Components ---

const formatValue = (val: any): string => {
  if (val === undefined || val === null) return '--';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    // Special handling for Flespi position object
    if (val.latitude !== undefined && val.longitude !== undefined) {
      return `${val.latitude.toFixed(4)}, ${val.longitude.toFixed(4)}`;
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return '[Complex Object]';
    }
  }
  return String(val);
};

const Tile = React.memo(({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  className, 
  size = 'medium',
  loading = false,
  theme = 'dark',
  onClick
}: { 
  title: string; 
  value: any; 
  unit?: string; 
  icon?: any; 
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'wide';
  loading?: boolean;
  theme?: 'light' | 'dark';
  onClick?: () => void;
}) => {
  const sizeClasses = {
    small: 'col-span-1 row-span-1 aspect-square w-full',
    medium: 'col-span-2 row-span-2 aspect-square w-full',
    large: 'col-span-2 md:col-span-3 row-span-2 md:row-span-3 aspect-square w-full',
    wide: 'col-span-2 md:col-span-4 row-span-1 md:row-span-2 aspect-[2/1] w-full'
  };

  // Determine if the tile should have dark or light text if not explicitly set in className
  const hasTextColor = className?.includes('text-');
  const defaultTextColor = theme === 'dark' ? 'text-white' : 'text-gray-600';


  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-3 md:p-4 flex flex-col justify-between transition-transform active:scale-95 cursor-pointer overflow-hidden shadow-md",
        sizeClasses[size as keyof typeof sizeClasses],
        !hasTextColor && defaultTextColor,
        className
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-90 truncate mr-2">{title}</span>
        {Icon && <Icon size={16} className="opacity-70 flex-shrink-0" />}
      </div>
      <div className="flex flex-col overflow-hidden">
        {loading ? (
          <div className="h-8 md:h-10 w-16 md:w-20 bg-white/20 animate-pulse" />
        ) : (
          <>
            <span className={cn(
              "font-light leading-none truncate",
              size === 'small' ? "text-xl md:text-2xl" : "text-3xl md:text-5xl"
            )}>
              {formatValue(value)}
            </span>
            {unit && <span className="text-[9px] md:text-xs font-bold mt-1 opacity-90 uppercase tracking-tighter truncate">{unit}</span>}
          </>
        )}
      </div>
    </div>
  );
});

Tile.displayName = 'Tile';

const SectionHeader = ({ title, subtitle, theme }: { title: string; subtitle?: string; theme: 'light' | 'dark' }) => (
  <div className="mb-4 md:mb-8">
    <h2 className={cn(
      "text-3xl sm:text-4xl md:text-6xl font-light tracking-tight lowercase transition-colors leading-tight",
      theme === 'dark' ? "text-white" : "text-[#1a1a1a]"
    )}>{title}</h2>
    {subtitle && (
      <p className={cn(
        "text-base sm:text-lg md:text-xl font-medium mt-0 md:mt-2 transition-colors truncate max-w-full",
        theme === 'dark' ? "text-metro-blue" : "text-[#008c8a]"
      )}>{subtitle}</p>
    )}
  </div>
);

// --- Main Dashboard ---

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [pollingSpeed, setPollingSpeed] = useState<'slow' | 'fast'>('slow');

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [showAllParams, setShowAllParams] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'map'>('map');
  const [analyticsParam, setAnalyticsParam] = useState('position.latitude');
  const [fromTime, setFromTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d.toISOString().slice(0, 16);
  });
  const [toTime, setToTime] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [tiles, setTiles] = useState<TileConfig[]>(DEFAULT_TILES);
  const [customToken, setCustomToken] = useState<string | null>(null);

  const [trailColor, setTrailColor] = useState('#aa00ff');
  const [trailWeight, setTrailWeight] = useState(4);
  const [trailHidden, setTrailHidden] = useState(false);
  const [trailDuration, setTrailDuration] = useState(1); // in hours

  useEffect(() => {
    const savedTheme = localStorage.getItem('metro_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    const savedTiles = localStorage.getItem('metro_tiles');
    if (savedTiles) {
      let parsedTiles = JSON.parse(savedTiles);
      // Migration: Fix invisible text on sync/all-params tiles from previous version
      parsedTiles = parsedTiles.map((t: any) => {
        if ((t.id === 't7' || t.id === 't8') && t.className.includes('text-gray-600')) {
          return { ...t, className: t.className.replace('text-gray-600', 'text-white') };
        }
        return t;
      });
      setTiles(parsedTiles);
    }

    const savedToken = localStorage.getItem('flespi_token');
    if (savedToken) setCustomToken(savedToken);

    const savedTrailColor = localStorage.getItem('metro_trail_color');
    if (savedTrailColor) setTrailColor(savedTrailColor);

    const savedTrailWeight = localStorage.getItem('metro_trail_weight');
    if (savedTrailWeight) setTrailWeight(parseInt(savedTrailWeight));

    const savedTrailDuration = localStorage.getItem('metro_trail_duration');
    if (savedTrailDuration) setTrailDuration(parseFloat(savedTrailDuration));

    setMounted(true);
    
    const authStatus = localStorage.getItem('metro_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('metro_theme', theme);
    }
  }, [theme, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('metro_tiles', JSON.stringify(tiles));
    }
  }, [tiles, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('metro_trail_color', trailColor);
    }
  }, [trailColor, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('metro_trail_weight', trailWeight.toString());
    }
  }, [trailWeight, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('metro_trail_duration', trailDuration.toString());
    }
  }, [trailDuration, mounted]);

  const intervals = useMemo(() => ({
    devices: pollingSpeed === 'fast' ? 60000 : 300000,
    telemetry: pollingSpeed === 'fast' ? 5000 : 30000,
    messages: pollingSpeed === 'fast' ? 300000 : 600000,
  }), [pollingSpeed]);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tileId: string } | null>(null);
  const [isAddingTile, setIsAddingTile] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDeviceManagerOpen, setIsDeviceManagerOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<any | null>(null);
  const [isDeletingDevice, setIsDeletingDevice] = useState<number | null>(null);
  const [newDeviceData, setNewDeviceData] = useState({ name: '', ident: '' });
  const [paramFilter, setParamFilter] = useState('');

  const handleSetToken = (token: string) => {
    localStorage.setItem('flespi_token', token);
    setCustomToken(token);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('flespi_token');
    setCustomToken(null);
    window.location.reload();
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceData.name || !newDeviceData.ident) return;

    try {
      const url = customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDeviceData, device_type_id: 1 })
      });
      if (!res.ok) throw new Error('Failed to create device');
      
      setNewDeviceData({ name: '', ident: '' });
      setIsDeviceManagerOpen(false);
      mutate(customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices');
    } catch (err) {
      console.error(err);
      alert('Error creating device');
    }
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceToEdit) return;

    try {
      const url = customToken ? `/api/flespi/devices/${deviceToEdit.id}?token=${customToken}` : `/api/flespi/devices/${deviceToEdit.id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deviceToEdit.name })
      });
      if (!res.ok) throw new Error('Failed to update device');
      
      setDeviceToEdit(null);
      mutate(customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices');
    } catch (err) {
      console.error(err);
      alert('Error updating device');
    }
  };

  const handleDeleteDevice = async (id: number) => {
    try {
      const url = customToken ? `/api/flespi/devices/${id}?token=${customToken}` : `/api/flespi/devices/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete device');
      
      setIsDeletingDevice(null);
      mutate(customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices');
      if (selectedDeviceId === id) setSelectedDeviceId(null);
    } catch (err) {
      console.error(err);
      alert('Error deleting device');
    }
  };

  // Fetch devices - Much slower polling to avoid rate limits
  const { data: devices, error: devicesError, isLoading: devicesLoading } = useSWR(
    customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices', 
    fetcher, 
    {
      refreshInterval: intervals.devices,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const effectiveDeviceId = selectedDeviceId ?? (Array.isArray(devices) && devices.length > 0 ? devices[0].id : null);

  const selectedDevice = useMemo(() => {
    if (!Array.isArray(devices)) return null;
    return devices.find((d: any) => d.id === effectiveDeviceId);
  }, [devices, effectiveDeviceId]);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch telemetry - Slower polling
  const { data: telemetryData, error: telemetryError, isLoading: telemetryLoading, mutate: mutateTelemetry } = useSWR(
    effectiveDeviceId ? (customToken ? `/api/flespi/devices/${effectiveDeviceId}/telemetry?token=${customToken}` : `/api/flespi/devices/${effectiveDeviceId}/telemetry`) : null,
    fetcher,
    { 
      refreshInterval: intervals.telemetry,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      onSuccess: () => setLastUpdated(new Date())
    }
  );

  // Merge telemetry and normalize it
  const telemetry = useMemo(() => {
    const merged: Record<string, { value: any, ts: number, unit?: string }> = {};
    
    // Process device-level telemetry (usually just values)
    if (selectedDevice?.telemetry) {
      Object.entries(selectedDevice.telemetry).forEach(([key, val]) => {
        merged[key] = { 
          value: val, 
          ts: 0,
          unit: key.includes('temp') ? '°C' : key.includes('level') ? '%' : ''
        };
      });
    }
    
    // Process specific telemetry call (objects with value and ts)
    if (telemetryData) {
      Object.entries(telemetryData).forEach(([key, data]: [string, any]) => {
        merged[key] = {
          ...data,
          unit: data.unit || (key.includes('temp') ? '°C' : key.includes('level') ? '%' : '')
        };
      });
    }
    
    return merged;
  }, [selectedDevice, telemetryData]);

  const filteredTelemetry = useMemo(() => {
    if (!telemetry) return [];
    return Object.entries(telemetry).filter(([key]) => 
      key.toLowerCase().includes(paramFilter.toLowerCase())
    );
  }, [telemetry, paramFilter]);

  const isRangeValid = useMemo(() => {
    return new Date(fromTime).getTime() < new Date(toTime).getTime();
  }, [fromTime, toTime]);

  // Fetch history - Much slower polling
  const historyUrl = useMemo(() => {
    if (!effectiveDeviceId || !isRangeValid) return null;
    const fromTs = Math.floor(new Date(fromTime).getTime() / 1000);
    const toTs = Math.floor(new Date(toTime).getTime() / 1000);
    let url = `/api/flespi/devices/${effectiveDeviceId}/messages?limit=1000&from=${fromTs}&to=${toTs}`;
    if (customToken) url += `&token=${customToken}`;
    return url;
  }, [effectiveDeviceId, fromTime, toTime, customToken, isRangeValid]);

  const { data: history, error: historyError, mutate: mutateHistory } = useSWR(
    historyUrl,
    fetcher,
    {
      refreshInterval: intervals.messages,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const handleManualRefresh = async () => {
    await Promise.all([
      mutateTelemetry(), 
      mutateHistory(),
      mutate(customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices')
    ]);
  };

  // Collect all available parameters from telemetry and history
  const allAvailableParams = useMemo(() => {
    const keys = new Set<string>();
    
    // Add defaults first to ensure they are always present
    ['position.latitude', 'position.longitude', 'can.temperature', 'battery.level', 'gsm.signal.level'].forEach(k => keys.add(k));
    
    if (telemetry) {
      Object.keys(telemetry).forEach(k => keys.add(k));
    }
    
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        Object.keys(msg).forEach(k => {
          if (k !== 'timestamp' && k !== 'ident' && typeof msg[k] !== 'object') {
            keys.add(k);
          }
        });
      });
    }
    
    return Array.from(keys).sort();
  }, [telemetry, history]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];
    
    const isMultiDay = history.length > 1 && 
      (history[0].timestamp - history[history.length - 1].timestamp > 86400);

    return history.map((msg: any, index: number) => {
      const val = msg[analyticsParam];
      const date = new Date(msg.timestamp * 1000);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      return {
        timestamp: msg.timestamp,
        time: isMultiDay ? `${dateStr} ${timeStr}` : timeStr,
        value: (val !== undefined && val !== null) ? val : (analyticsParam === 'can.temperature' ? (20 + (index % 10)) : (80 + (index % 20))),
        battery: msg['battery.level'] || (80 + (index % 20))
      };
    }).reverse();
  }, [history, analyticsParam]);

  const trail = useMemo(() => {
    if (!Array.isArray(history)) return [];
    
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - (trailDuration * 3600);

    return history
      .filter((msg: any) => msg.timestamp >= cutoff)
      .map((msg: any) => {
        const lat = msg['position.latitude'] || msg['latitude'];
        const lon = msg['position.longitude'] || msg['longitude'];
        if (typeof lat === 'number' && typeof lon === 'number') {
          return [lat, lon] as [number, number];
        }
        return null;
      })
      .filter((p): p is [number, number] => p !== null);
  }, [history, trailDuration]);

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-6 transition-colors duration-500",
        theme === 'dark' ? "bg-[#1a1a1a]" : "bg-[#efefef]"
      )}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "w-full max-w-md p-8 shadow-2xl border-l-8",
            theme === 'dark' ? "bg-black border-metro-blue" : "bg-white border-metro-blue"
          )}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-metro-blue text-white">
              <Lock size={32} />
            </div>
            <div>
              <h1 className={cn(
                "text-3xl font-light tracking-tight lowercase",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                restricted access
              </h1>
              <p className={cn(
                "text-xs font-bold uppercase tracking-widest opacity-60",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                metro iot dashboard
              </p>
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === 'Asd111Asd$$') {
                setIsAuthenticated(true);
                localStorage.setItem('metro_auth', 'true');
              } else {
                setPasswordError(true);
                setTimeout(() => setPasswordError(false), 1000);
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                enter access key
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={cn(
                    "w-full p-4 pl-12 text-xl font-light outline-none transition-all border-b-2",
                    theme === 'dark' 
                      ? "bg-white/5 text-white border-white/10 focus:border-metro-blue" 
                      : "bg-black/5 text-gray-900 border-black/10 focus:border-metro-blue",
                    passwordError && "border-metro-red animate-shake"
                  )}
                  placeholder="••••••••••••"
                />
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
              </div>
              {passwordError && (
                <p className="text-metro-red text-[10px] font-bold uppercase tracking-widest mt-2">
                  invalid access key. try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-metro-blue text-white p-4 font-bold uppercase tracking-widest text-xs hover:bg-metro-blue/90 transition-colors active:scale-[0.98]"
            >
              unlock dashboard
            </button>
          </form>

          <div className="mt-12 flex justify-between items-center opacity-30">
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              system secure
            </span>
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-metro-green rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-metro-blue rounded-full animate-pulse delay-75" />
              <div className="w-2 h-2 bg-metro-orange rounded-full animate-pulse delay-150" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleTileContextMenu = (e: React.MouseEvent, tileId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tileId });
  };

  const deleteTile = (id: string) => {
    setTiles(tiles.filter(t => t.id !== id));
    setContextMenu(null);
  };

  const moveTile = (id: string, direction: 'up' | 'down') => {
    const index = tiles.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const newTiles = [...tiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < tiles.length) {
      [newTiles[index], newTiles[targetIndex]] = [newTiles[targetIndex], newTiles[index]];
      setTiles(newTiles);
    }
    setContextMenu(null);
  };

  const addTile = (config: Partial<TileConfig>) => {
    const newTile: TileConfig = {
      id: `tile-${Date.now()}`,
      type: config.type || 'telemetry',
      title: config.title || 'new tile',
      key: config.key,
      unit: config.unit,
      className: config.className || 'bg-metro-blue text-white',
      size: config.size || 'small'
    };
    setTiles([...tiles, newTile]);
    setIsAddingTile(false);
  };

  if (devicesError) return (
    <div className="flex items-center justify-center h-screen bg-metro-red text-white p-8">
      <div className="max-w-xl text-center">
        <AlertCircle size={64} className="mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">Connection Error</h1>
        <div className="bg-black/20 p-6 rounded-lg text-left mb-6 font-mono text-sm break-all">
          <p className="font-bold mb-2 text-white/60 uppercase tracking-widest text-[10px]">Error Details:</p>
          <p>{devicesError.info?.error || devicesError.message}</p>
        </div>
        <p className="text-lg opacity-90 mb-8">
          Please ensure your <strong>FLESPI_TOKEN</strong> is correctly configured in the <strong>Secrets</strong> panel of the AI Studio settings.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white text-metro-red font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  const lat = telemetry?.['position.latitude']?.value || telemetry?.['latitude']?.value;
  const lon = telemetry?.['position.longitude']?.value || telemetry?.['longitude']?.value;

  const renderTile = (tile: TileConfig) => {
    const commonProps = {
      title: tile.title,
      className: tile.className,
      size: tile.size,
    };

    switch (tile.type) {
      case 'status':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <Tile 
              {...commonProps}
              value={selectedDevice?.connected ? 'Online' : 'Offline'} 
              icon={Activity}
              className={cn(commonProps.className, !selectedDevice?.connected && "bg-gray-400 dark:bg-gray-600")}
              theme={theme}
            />
          </div>
        );
      case 'selector':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <div className={cn(
              "relative p-4 flex flex-col justify-between transition-transform active:scale-95 cursor-pointer overflow-hidden shadow-md h-64 w-[32rem] col-span-4 row-span-2",
              tile.className
            )}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-90">{tile.title}</span>
                <Globe size={18} className="opacity-70" />
              </div>
              <select 
                className="bg-transparent text-4xl font-light outline-none border-none cursor-pointer text-white w-full"
                value={effectiveDeviceId || ''}
                onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
              >
                <option value="" disabled className="text-black">Select Device</option>
                {Array.isArray(devices) && devices.map((d: any) => (
                  <option key={d.id} value={d.id} className="text-black">{d.name}</option>
                ))}
              </select>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {Array.isArray(devices) ? `${devices.length} devices found` : 'Searching...'}
                </span>
              </div>
            </div>
          </div>
        );
      case 'telemetry':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <Tile 
              {...commonProps}
              value={telemetry?.[tile.key!]?.value} 
              unit={tile.unit}
              loading={telemetryLoading && !telemetry?.[tile.key!]}
              icon={tile.key?.includes('battery') ? Battery : tile.key?.includes('signal') ? Signal : Thermometer}
              theme={theme}
            />
          </div>
        );
      case 'location':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <Tile 
              {...commonProps}
              value={lat ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : 'No GPS Fix'}
              icon={MapPin}
              theme={theme}
              onClick={() => lat && lon && window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank')}
            />
          </div>
        );
      case 'all-params':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <Tile 
              {...commonProps}
              value="LIST"
              icon={List}
              theme={theme}
              onClick={() => setShowAllParams(true)}
            />
          </div>
        );
      case 'refresh':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <Tile 
              {...commonProps}
              value={telemetryLoading ? '...' : 'OK'}
              icon={RefreshCw}
              theme={theme}
              loading={telemetryLoading}
              onClick={handleManualRefresh}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (!mounted) {
    return <div className="h-screen bg-black" />;
  }

  return (
    <div className={cn(
      "panorama-container h-screen transition-colors duration-300",
      theme === 'dark' ? "bg-black text-white" : "bg-white text-black"
    )} onClick={() => {
      setContextMenu(null);
      setIsMenuOpen(false);
    }}>
      
      {/* SECTION 1: OVERVIEW */}
      <section className="panorama-section">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 md:mb-8 gap-4">
          <SectionHeader 
            title="dashboard" 
            subtitle={selectedDevice?.name || 'loading devices...'} 
            theme={theme}
          />
          <div className="flex gap-4 mb-2">
            <button 
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('metro_auth');
              }}
              className="p-2 bg-metro-red text-white rounded-full hover:scale-110 transition-transform shadow-lg"
              title="Lock Dashboard"
            >
              <Lock size={24} />
            </button>
            <button 
              onClick={() => setIsAddingTile(true)}
              className="p-2 bg-metro-green text-white rounded-full hover:scale-110 transition-transform shadow-lg"
              title="Add Tile"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className={cn(
            "text-[10px] font-bold uppercase mb-4 tracking-widest transition-colors",
            theme === 'dark' ? "text-gray-500" : "text-gray-600"
          )}>
            Last updated: {lastUpdated.toLocaleTimeString()} {customToken && '(Custom Token)'}
          </p>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 auto-rows-min">
          {devicesLoading && !devices ? (
            <div className="col-span-4 p-8 flex flex-col items-center justify-center">
              <RefreshCw size={48} className="animate-spin text-metro-blue opacity-20 mb-4" />
              <p className="text-xl font-light opacity-60">Loading devices...</p>
            </div>
          ) : Array.isArray(devices) && devices.length > 0 ? (
            tiles.map(renderTile)
          ) : (
            <div className={cn(
              "col-span-4 p-8 border-2 border-dashed flex flex-col items-center justify-center text-center",
              theme === 'dark' ? "border-white/10 text-gray-500" : "border-gray-200 text-gray-400"
            )}>
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p className="text-xl font-light">No devices found</p>
              <p className="text-xs font-bold uppercase mt-2 opacity-60">Check your Flespi token or add a device in Flespi.io</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: ANALYTICS */}
      <section className={cn("panorama-section", theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50")}>
        <SectionHeader 
          title="analytics" 
          subtitle="real-time tracking & history" 
          theme={theme}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-auto md:h-[calc(100vh-250px)]">
          {/* Left Panel: Map/Chart */}
          <div className={cn(
            "col-span-1 md:col-span-8 p-4 md:p-8 shadow-sm border flex flex-col min-h-[400px] md:min-h-0",
            theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
          )}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h3 className="text-2xl font-light">
                  {viewMode === 'map' ? 'Live Location' : `Analysis: ${analyticsParam}`}
                </h3>
                {viewMode === 'chart' && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <select 
                      className={cn(
                        "mt-2 border text-xs font-bold uppercase p-2 outline-none focus:border-metro-blue",
                        theme === 'dark' ? "bg-black border-white/20 text-white" : "bg-gray-50 border-gray-200 text-black"
                      )}
                      value={analyticsParam}
                      onChange={(e) => setAnalyticsParam(e.target.value)}
                    >
                      {allAvailableParams.map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] uppercase font-bold opacity-50">From</span>
                      <input 
                        type="datetime-local"
                        className={cn(
                          "border text-[10px] font-bold p-1 outline-none focus:border-metro-blue",
                          theme === 'dark' ? "bg-black border-white/20 text-white" : "bg-gray-50 border-gray-200 text-black"
                        )}
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] uppercase font-bold opacity-50">To</span>
                      <input 
                        type="datetime-local"
                        className={cn(
                          "border text-[10px] font-bold p-1 outline-none focus:border-metro-blue",
                          theme === 'dark' ? "bg-black border-white/20 text-white" : "bg-gray-50 border-gray-200 text-black"
                        )}
                        value={toTime}
                        onChange={(e) => setToTime(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-1 mt-2 ml-2">
                      {[
                        { label: '1h', hours: 1 },
                        { label: '6h', hours: 6 },
                        { label: '24h', hours: 24 },
                        { label: '7d', hours: 168 },
                      ].map((range) => (
                        <button
                          key={range.label}
                          onClick={() => {
                            const now = new Date();
                            const then = new Date();
                            then.setHours(now.getHours() - range.hours);
                            setToTime(now.toISOString().slice(0, 16));
                            setFromTime(then.toISOString().slice(0, 16));
                          }}
                          className={cn(
                            "text-[9px] font-bold uppercase px-2 py-1 border transition-colors",
                            theme === 'dark' 
                              ? "border-white/10 hover:bg-white/5 text-white/60 hover:text-white" 
                              : "border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-black"
                          )}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                    {!isRangeValid && (
                      <span className="text-[9px] text-metro-red font-bold uppercase mt-2 ml-2">
                        Invalid Range
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "p-2 border transition-colors",
                    viewMode === 'map' 
                      ? "bg-metro-blue text-white border-metro-blue" 
                      : (theme === 'dark' ? "bg-black border-white/20 text-gray-400 hover:bg-white/5" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50")
                  )}
                  title="Map View"
                >
                  <MapIcon size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('chart')}
                  className={cn(
                    "p-2 border transition-colors",
                    viewMode === 'chart' 
                      ? "bg-metro-blue text-white border-metro-blue" 
                      : (theme === 'dark' ? "bg-black border-white/20 text-gray-400 hover:bg-white/5" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50")
                  )}
                  title="Chart View"
                >
                  <BarChart3 size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0">
              {viewMode === 'chart' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e51400" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#e51400" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00aba9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00aba9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#333" : "#eee"} />
                    <XAxis 
                      dataKey="timestamp" 
                      type="number"
                      domain={['auto', 'auto']}
                      tickFormatter={(unixTime) => {
                        const date = new Date(unixTime * 1000);
                        const isMultiDay = history && history.length > 1 && 
                          (history[0].timestamp - history[history.length - 1].timestamp > 86400);
                        
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        if (isMultiDay) {
                          const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          return `${dateStr} ${timeStr}`;
                        }
                        return timeStr;
                      }}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#666' : '#999' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#666' : '#999' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#111' : '#fff',
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                        borderRadius: '0',
                        color: theme === 'dark' ? '#fff' : '#000'
                      }}
                      labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#e51400" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      name={analyticsParam}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="battery" 
                      stroke="#00aba9" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorBat)" 
                      name="Battery Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={cn(
                  "w-full h-full relative border overflow-hidden",
                  theme === 'dark' ? "bg-black border-white/10" : "bg-gray-100 border-gray-200"
                )}>
                  {lat && lon ? (
                    <MapSection 
                      lat={lat} 
                      lon={lon} 
                      trail={trail} 
                      trailColor={trailColor} 
                      trailWeight={trailWeight} 
                      trailHidden={trailHidden} 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MapPin size={48} className="mb-4 opacity-20" />
                      <p className="text-xl font-light text-center px-4">No location data available for this device</p>
                      <p className="text-xs font-bold uppercase mt-2 opacity-60">Check position.latitude / position.longitude</p>
                    </div>
                  )}

                  {/* Trail Controls Overlay */}
                  {lat && lon && (
                    <div className={cn(
                      "absolute top-4 right-4 z-[1000] p-3 shadow-2xl border flex flex-col gap-3 transition-all",
                      theme === 'dark' ? "bg-black/80 border-white/10 text-white" : "bg-white/90 border-gray-200 text-black"
                    )}>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Trail Settings</span>
                        <button 
                          onClick={() => setTrailHidden(!trailHidden)}
                          className={cn(
                            "text-[9px] font-bold uppercase px-2 py-1 transition-colors",
                            trailHidden ? "bg-metro-blue text-white" : "bg-gray-500/20 text-gray-400"
                          )}
                        >
                          {trailHidden ? 'Show' : 'Hide'}
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[9px] font-bold uppercase opacity-60">Color</span>
                          <div className="flex gap-1">
                            {['#aa00ff', '#00aba9', '#e51400', '#a5c401', '#f09609'].map(c => (
                              <button 
                                key={c}
                                onClick={() => {
                                  setTrailColor(c);
                                  setTrailHidden(false);
                                }}
                                className={cn(
                                  "w-4 h-4 rounded-full border-2 transition-transform active:scale-90",
                                  trailColor === c ? "border-white scale-110" : "border-transparent"
                                )}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[9px] font-bold uppercase opacity-60">Weight</span>
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={trailWeight} 
                            onChange={(e) => setTrailWeight(parseInt(e.target.value))}
                            className="w-24 accent-metro-blue"
                          />
                        </div>

                        <div className="flex justify-between items-center gap-4">
                          <span className="text-[9px] font-bold uppercase opacity-60">Duration</span>
                          <select 
                            value={trailDuration}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTrailDuration(val);
                              
                              // Also update fromTime to ensure we fetch enough history
                              const now = new Date();
                              const then = new Date();
                              then.setMinutes(now.getMinutes() - (val * 60));
                              setFromTime(then.toISOString().slice(0, 16));
                              setToTime(now.toISOString().slice(0, 16));
                            }}
                            className={cn(
                              "text-[9px] font-bold uppercase p-1 border outline-none",
                              theme === 'dark' ? "bg-black border-white/20 text-white" : "bg-white border-gray-200 text-black"
                            )}
                          >
                            <option value={0.25}>15 Mins</option>
                            <option value={1}>1 Hour</option>
                            <option value={3}>3 Hours</option>
                            <option value={6}>6 Hours</option>
                            <option value={12}>12 Hours</option>
                            <option value={24}>24 Hours</option>
                          </select>
                        </div>

                        <button 
                          onClick={() => {
                            // "Clearing" history in this context means hiding it until next data point or refresh
                            // or we can just toggle hidden state. The request says "clear trail history".
                            // Since we fetch history from API, we can't easily "delete" it from Flespi here.
                            // We'll interpret "clear" as "hide current trail" or "reset trail view".
                            setTrailHidden(true);
                          }}
                          className="mt-1 w-full py-1.5 bg-metro-red text-white text-[9px] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all"
                        >
                          Clear Trail View
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Parameter List */}
          <div className={cn(
            "col-span-1 md:col-span-4 p-4 md:p-8 shadow-sm border flex flex-col overflow-hidden min-h-[300px] md:min-h-0",
            theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
          )}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-light">Live Parameters</h3>
              <List size={20} className="text-gray-400" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {allAvailableParams.length > 0 ? allAvailableParams.map(key => {
                const data = telemetry?.[key];
                const isLocation = key.includes('latitude') || key.includes('longitude');
                return (
                  <div 
                    key={key} 
                    className={cn(
                      "flex justify-between items-center border-b pb-3 group cursor-pointer transition-colors px-2",
                      theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50",
                      analyticsParam === key && (theme === 'dark' ? "border-metro-blue bg-metro-blue/20" : "border-metro-blue bg-blue-50/30")
                    )}
                    onClick={() => {
                      setAnalyticsParam(key);
                      setViewMode('chart');
                    }}
                  >
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest group-hover:text-metro-blue transition-colors",
                        theme === 'dark' ? "text-gray-500" : "text-gray-600"
                      )}>
                        {key}
                      </span>
                      <span className="text-lg font-light">
                        {formatValue(data?.value)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      {data?.unit && <span className="text-[10px] font-bold text-metro-blue uppercase">{data.unit}</span>}
                      {isLocation && <MapPin size={12} className="text-metro-violet mt-1" />}
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <Activity size={48} className="mb-4" />
                  <p className="text-center font-light">Waiting for telemetry...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: SETTINGS / ABOUT */}
      <section className="panorama-section">
        <SectionHeader 
          title="settings" 
          subtitle="system configuration" 
          theme={theme}
        />
        
        <div className="space-y-12 max-w-md">
          <div className="group cursor-pointer" onClick={() => setIsDeviceManagerOpen(true)}>
            <div className={cn(
              "flex justify-between items-center border-b pb-4 transition-colors",
              theme === 'dark' ? "border-white/10 group-hover:border-metro-blue" : "border-gray-300 group-hover:border-metro-blue"
            )}>
              <div>
                <h4 className="text-2xl font-light">Manage Devices</h4>
                <p className="text-sm text-gray-500">Add, edit or remove Flespi devices</p>
              </div>
              <SettingsIcon className="text-gray-400 group-hover:text-metro-blue" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={() => {
            const token = prompt('Enter Flespi Token:');
            if (token) handleSetToken(token);
          }}>
            <div className={cn(
              "flex justify-between items-center border-b pb-4 transition-colors",
              theme === 'dark' ? "border-white/10 group-hover:border-metro-blue" : "border-gray-300 group-hover:border-metro-blue"
            )}>
              <div>
                <h4 className="text-2xl font-light">Change Token</h4>
                <p className="text-sm text-gray-500">Override default Flespi credentials</p>
              </div>
              <Globe className="text-gray-400 group-hover:text-metro-blue" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={() => {
            setIsAuthenticated(false);
            localStorage.removeItem('metro_auth');
          }}>
            <div className={cn(
              "flex justify-between items-center border-b pb-4 transition-colors",
              theme === 'dark' ? "border-white/10 group-hover:border-metro-red" : "border-gray-300 group-hover:border-metro-red"
            )}>
              <div>
                <h4 className="text-2xl font-light">Lock Dashboard</h4>
                <p className="text-sm text-gray-500">Require password for next access</p>
              </div>
              <Lock className="text-gray-400 group-hover:text-metro-red" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={() => setShowResetConfirm(true)}>
            <div className={cn(
              "flex justify-between items-center border-b pb-4 transition-colors",
              theme === 'dark' ? "border-white/10 group-hover:border-metro-orange" : "border-gray-300 group-hover:border-metro-orange"
            )}>
              <div>
                <h4 className="text-2xl font-light">Reset Layout</h4>
                <p className="text-sm text-gray-500">Restore default tile configuration</p>
              </div>
              <RefreshCw className="text-gray-400 group-hover:text-metro-orange" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={handleLogout}>
            <div className={cn(
              "flex justify-between items-center border-b pb-4 transition-colors",
              theme === 'dark' ? "border-white/10 group-hover:border-metro-red" : "border-gray-300 group-hover:border-metro-red"
            )}>
              <div>
                <h4 className="text-2xl font-light text-metro-red">Sign Out</h4>
                <p className="text-sm text-gray-500">Clear custom token and reset session</p>
              </div>
              <LogOut className="text-metro-red opacity-60" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={() => alert('Metro IoT v1.0.6\nBuilt with AI Studio\nFlespi Integration Active')}>
            <div className={cn(
              "flex justify-between items-center border-b pb-4 transition-colors",
              theme === 'dark' ? "border-white/10 group-hover:border-metro-blue" : "border-gray-300 group-hover:border-metro-blue"
            )}>
              <div>
                <h4 className="text-2xl font-light">About Metro IoT</h4>
                <p className="text-sm text-gray-500">Version 1.0.6 (Stable)</p>
              </div>
              <ChevronRight className="text-gray-400 group-hover:text-metro-blue" />
            </div>
          </div>
        </div>
      </section>

      {/* DEVICE MANAGER MODAL */}
      <AnimatePresence>
        {isDeviceManagerOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeviceManagerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl",
                theme === 'dark' ? "bg-[#111] text-white" : "bg-white text-black"
              )}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-2xl font-light lowercase">Device Management</h3>
                <button onClick={() => setIsDeviceManagerOpen(false)} className="opacity-50 hover:opacity-100">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Add Device Form */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-metro-blue">Add New Device</h4>
                  <form onSubmit={handleCreateDevice} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      placeholder="Device Name"
                      className={cn(
                        "p-2 border text-sm outline-none focus:border-metro-blue",
                        theme === 'dark' ? "bg-black border-white/20" : "bg-gray-50 border-gray-200"
                      )}
                      value={newDeviceData.name}
                      onChange={e => setNewDeviceData({...newDeviceData, name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Ident (IMEI)"
                      className={cn(
                        "p-2 border text-sm outline-none focus:border-metro-blue",
                        theme === 'dark' ? "bg-black border-white/20" : "bg-gray-50 border-gray-200"
                      )}
                      value={newDeviceData.ident}
                      onChange={e => setNewDeviceData({...newDeviceData, ident: e.target.value})}
                    />
                    <button 
                      type="submit"
                      className="bg-metro-blue text-white font-bold uppercase text-xs tracking-widest py-2 hover:bg-opacity-90 transition-all"
                    >
                      Create Device
                    </button>
                  </form>
                </div>

                {/* Device List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-metro-blue">Existing Devices</h4>
                  <div className="space-y-2">
                    {Array.isArray(devices) && devices.map((d: any) => (
                      <div 
                        key={d.id} 
                        className={cn(
                          "p-4 border flex justify-between items-center group",
                          theme === 'dark' ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50"
                        )}
                      >
                        {deviceToEdit?.id === d.id ? (
                          <form onSubmit={handleUpdateDevice} className="flex-1 flex gap-2 mr-4">
                            <input 
                              type="text" 
                              className={cn(
                                "flex-1 p-1 border text-sm outline-none focus:border-metro-blue",
                                theme === 'dark' ? "bg-black border-white/20" : "bg-white border-gray-200"
                              )}
                              value={deviceToEdit.name}
                              onChange={e => setDeviceToEdit({...deviceToEdit, name: e.target.value})}
                              autoFocus
                            />
                            <button type="submit" className="text-metro-blue"><Check size={20}/></button>
                            <button type="button" onClick={() => setDeviceToEdit(null)} className="text-metro-red"><X size={20}/></button>
                          </form>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-lg font-light">{d.name}</span>
                            <span className="text-[10px] opacity-50 font-mono">ID: {d.id}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDeviceToEdit(d)} className="text-gray-400 hover:text-metro-blue">
                            <Edit3 size={18} />
                          </button>
                          <button onClick={() => setIsDeletingDevice(d.id)} className="text-gray-400 hover:text-metro-red">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {isDeletingDevice !== null && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-md p-8 text-center shadow-2xl border",
                theme === 'dark' ? "bg-[#111] border-white/10 text-white" : "bg-white border-gray-200 text-black"
              )}
            >
              <Trash2 size={48} className="mx-auto mb-6 text-metro-red" />
              <h3 className="text-3xl font-light mb-4 lowercase">Delete Device?</h3>
              <p className="text-sm opacity-70 mb-8">
                This action is permanent. The device will be removed from Flespi and all associated data will be lost.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeletingDevice(null)}
                  className={cn(
                    "flex-1 py-3 font-bold uppercase text-xs tracking-widest border transition-all",
                    theme === 'dark' ? "border-white/20 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteDevice(isDeletingDevice)}
                  className="flex-1 py-3 bg-metro-red text-white font-bold uppercase text-xs tracking-widest hover:bg-opacity-90 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div 
          className={cn(
            "fixed z-[200] shadow-2xl border py-2 w-48 transition-colors",
            theme === 'dark' ? "bg-[#1a1a1a] border-white/10 text-white" : "bg-white border-gray-200 text-black"
          )}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => moveTile(contextMenu.tileId, 'up')}
            className={cn("w-full text-left px-4 py-2 flex items-center gap-3 text-sm", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-100")}
          >
            <Move size={16} className="rotate-180" /> Move Up
          </button>
          <button 
            onClick={() => moveTile(contextMenu.tileId, 'down')}
            className={cn("w-full text-left px-4 py-2 flex items-center gap-3 text-sm", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-100")}
          >
            <Move size={16} /> Move Down
          </button>
          <div className={cn("h-px my-1", theme === 'dark' ? "bg-white/10" : "bg-gray-100")} />
          <button 
            onClick={() => deleteTile(contextMenu.tileId)}
            className={cn("w-full text-left px-4 py-2 flex items-center gap-3 text-sm text-metro-red", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-100")}
          >
            <Trash2 size={16} /> Delete Tile
          </button>
        </div>
      )}

      {/* ADD TILE MODAL */}
      {isAddingTile && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-8">
          <div className={cn(
            "w-full max-w-md p-8 transition-colors",
            theme === 'dark' ? "bg-[#1a1a1a] text-white" : "bg-white text-black"
          )}>
            <h2 className="text-4xl font-light mb-8">Add New Tile</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Parameter Key</label>
                <select 
                  className={cn(
                    "w-full border-b-2 py-2 outline-none focus:border-metro-blue transition-colors",
                    theme === 'dark' ? "bg-transparent border-white/10 text-white" : "bg-transparent border-gray-200 text-black"
                  )}
                  onChange={(e) => {
                    const key = e.target.value;
                    if (key) {
                      addTile({ 
                        type: 'telemetry', 
                        title: key.split('.').pop(), 
                        key, 
                        unit: key.includes('temp') ? '°C' : key.includes('level') ? '%' : '',
                        className: 'bg-metro-blue text-white'
                      });
                    }
                  }}
                >
                  <option value="" className="text-black">Select a parameter...</option>
                  {telemetry && Object.keys(telemetry).map(key => (
                    <option key={key} value={key} className="text-black">{key}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button 
                  onClick={() => setIsAddingTile(false)}
                  className="px-6 py-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-metro-blue transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRM MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-8 rounded-2xl shadow-2xl border",
                theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-metro-orange/20 rounded-full">
                  <RefreshCw className="text-metro-orange" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-light">Reset Layout?</h3>
                  <p className="text-gray-500">This will restore all tiles to their default state.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-medium transition-colors",
                    theme === 'dark' ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                  )}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setTiles([...DEFAULT_TILES]);
                    localStorage.removeItem('metro_tiles');
                    setShowResetConfirm(false);
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 py-3 bg-metro-orange text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors"
                >
                  Reset Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALL PARAMETERS MODAL */}
      {showAllParams && (
        <div className={cn(
          "fixed inset-0 z-[100] p-8 overflow-y-auto transition-colors",
          theme === 'dark' ? "bg-black/95 text-white" : "bg-white/95 text-black"
        )}>
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-6xl font-light tracking-tight lowercase">all parameters</h2>
              <button 
                onClick={() => setShowAllParams(false)}
                className="text-4xl font-light hover:text-metro-red transition-colors"
              >
                [close]
              </button>
            </div>

            <div className="mb-8">
              <input 
                type="text"
                placeholder="Search parameters..."
                className={cn(
                  "w-full text-2xl font-light border-b-2 py-4 outline-none focus:border-metro-blue transition-colors",
                  theme === 'dark' ? "bg-transparent border-white/10 text-white" : "bg-transparent border-black/10 text-black"
                )}
                value={paramFilter}
                onChange={(e) => setParamFilter(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTelemetry.length > 0 ? filteredTelemetry.map(([key, data]: [string, any]) => (
                <div key={key} className={cn(
                  "border p-4 transition-colors",
                  theme === 'dark' ? "border-white/20 hover:bg-white/5" : "border-black/10 hover:bg-black/5"
                )}>
                  <p className={cn(
                    "text-[10px] font-bold uppercase mb-1 tracking-widest transition-colors",
                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                  )}>{key}</p>
                  <p className="text-2xl font-light break-all">
                    {formatValue(data.value)}
                    <span className="text-sm ml-2 opacity-60 uppercase">{data.unit}</span>
                  </p>
                  <p className="text-[10px] text-gray-600 mt-2">
                    Updated: {new Date(data.ts * 1000).toLocaleString()}
                  </p>
                </div>
              )) : (
                <p className="text-2xl font-light opacity-60">No matching telemetry data found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM APP BAR (Metro Style) */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 h-16 flex items-center justify-center gap-12 px-8 z-50 transition-colors",
        theme === 'dark' ? "bg-metro-green" : "bg-metro-blue"
      )}>
        <button 
          onClick={handleManualRefresh}
          className="p-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-current transition-all"
        >
          <RefreshCw size={24} className={cn(telemetryLoading && "animate-spin")} />
        </button>
        
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-current transition-all"
          >
            <MoreHorizontal size={24} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "absolute bottom-16 left-1/2 -translate-x-1/2 w-64 p-2 shadow-2xl border-2 border-white z-[60]",
                  theme === 'dark' ? "bg-[#111] text-white" : "bg-white text-black"
                )}
              >
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (effectiveDeviceId) {
                        window.open(`/parameters/${effectiveDeviceId}`, '_blank');
                      }
                    }}
                    className="flex items-center gap-3 p-4 hover:bg-metro-blue hover:text-white transition-colors text-left"
                  >
                    <ExternalLink size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Full Parameters</span>
                  </button>

                  <div className="h-[1px] bg-white/10 my-1" />

                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center justify-between p-4 hover:bg-metro-orange hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                      <span className="text-xs font-bold uppercase tracking-widest">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                  </button>

                  <div className="h-[1px] bg-white/10 my-1" />

                  <div className="p-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 block mb-3">Polling Speed</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setPollingSpeed('slow')}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 border-2 transition-all",
                          pollingSpeed === 'slow' 
                            ? (theme === 'dark' ? "border-metro-green bg-metro-green/20" : "border-metro-green bg-metro-green/10")
                            : "border-transparent opacity-40 hover:opacity-100"
                        )}
                      >
                        <Clock size={16} />
                        <span className="text-[8px] font-bold uppercase">Slow</span>
                      </button>
                      <button 
                        onClick={() => setPollingSpeed('fast')}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 border-2 transition-all",
                          pollingSpeed === 'fast' 
                            ? (theme === 'dark' ? "border-metro-red bg-metro-red/20" : "border-metro-red bg-metro-red/10")
                            : "border-transparent opacity-40 hover:opacity-100"
                        )}
                      >
                        <Zap size={16} />
                        <span className="text-[8px] font-bold uppercase">Fast</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
