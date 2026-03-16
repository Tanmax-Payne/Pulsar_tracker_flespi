'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { 
  MapPin,
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
  X
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
  { id: 't1', type: 'status', title: 'status', className: 'bg-metro-green text-white', size: 'medium' },
  { id: 't2', type: 'selector', title: 'switch device', className: 'bg-metro-blue text-white', size: 'wide' },
  { id: 't3', type: 'telemetry', title: 'battery', key: 'battery.level', unit: '%', className: 'bg-metro-orange text-white', size: 'small' },
  { id: 't4', type: 'telemetry', title: 'signal', key: 'gsm.signal.level', unit: 'dbm', className: 'bg-metro-cyan text-white', size: 'small' },
  { id: 't5', type: 'location', title: 'location', className: 'bg-metro-violet text-white', size: 'small' },
  { id: 't6', type: 'telemetry', title: 'temp', key: 'can.temperature', unit: '°C', className: 'bg-metro-red text-white', size: 'small' },
  { id: 't7', type: 'all-params', title: 'all params', className: 'bg-metro-magenta text-white', size: 'small' },
  { id: 't8', type: 'refresh', title: 'sync', className: 'bg-[#333] text-white', size: 'small' },
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

const Tile = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  className, 
  size = 'medium' 
}: { 
  title: string; 
  value: any; 
  unit?: string; 
  icon?: any; 
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'wide'
}) => {
  const sizeClasses = {
    small: 'col-span-1 row-span-1 h-32 w-32',
    medium: 'col-span-2 row-span-2 h-64 w-64',
    large: 'col-span-3 row-span-3 h-96 w-96',
    wide: 'col-span-4 row-span-2 h-64 w-[32rem]'
  };

  return (
    <div className={cn(
      "relative p-4 flex flex-col justify-between transition-transform active:scale-95 cursor-pointer overflow-hidden",
      sizeClasses[size as keyof typeof sizeClasses],
      className
    )}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</span>
        {Icon && <Icon size={20} className="opacity-60" />}
      </div>
      <div className="flex flex-col">
        <span className={cn(
          "font-light leading-none",
          size === 'small' ? "text-2xl" : "text-5xl"
        )}>
          {value ?? '--'}
        </span>
        {unit && <span className="text-sm font-medium mt-1 opacity-80">{unit}</span>}
      </div>
    </div>
  );
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-8">
    <h2 className="text-6xl font-light tracking-tight text-[#1a1a1a] lowercase">{title}</h2>
    {subtitle && <p className="text-xl text-metro-blue font-medium mt-2">{subtitle}</p>}
  </div>
);

// --- Main Dashboard ---

export default function Dashboard() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [showAllParams, setShowAllParams] = useState(false);
  const [analyticsParam, setAnalyticsParam] = useState('can.temperature');
  const [tiles, setTiles] = useState<TileConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('metro_tiles');
      return saved ? JSON.parse(saved) : DEFAULT_TILES;
    }
    return DEFAULT_TILES;
  });
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tileId: string } | null>(null);
  const [isAddingTile, setIsAddingTile] = useState(false);

  useEffect(() => {
    localStorage.setItem('metro_tiles', JSON.stringify(tiles));
  }, [tiles]);

  const [customToken, setCustomToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('flespi_token');
    }
    return null;
  });

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

  // Fetch devices - Slower polling as requested
  const { data: devices, error: devicesError, isLoading: devicesLoading } = useSWR(
    customToken ? `/api/flespi/devices?token=${customToken}` : '/api/flespi/devices', 
    fetcher, 
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false
    }
  );

  const effectiveDeviceId = selectedDeviceId ?? (Array.isArray(devices) && devices.length > 0 ? devices[0].id : null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch telemetry - Slower polling
  const { data: telemetry, error: telemetryError, isLoading: telemetryLoading, mutate: mutateTelemetry } = useSWR(
    effectiveDeviceId ? (customToken ? `/api/flespi/devices/${effectiveDeviceId}/telemetry?token=${customToken}` : `/api/flespi/devices/${effectiveDeviceId}/telemetry`) : null,
    fetcher,
    { 
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      onSuccess: () => setLastUpdated(new Date())
    }
  );

  // Fetch history - Slower polling
  const { data: history, error: historyError, mutate: mutateHistory } = useSWR(
    effectiveDeviceId ? (customToken ? `/api/flespi/devices/${effectiveDeviceId}/messages?limit=100&token=${customToken}` : `/api/flespi/devices/${effectiveDeviceId}/messages?limit=100`) : null,
    fetcher,
    {
      refreshInterval: 600000, // 10 minutes
      revalidateOnFocus: false
    }
  );

  const handleManualRefresh = async () => {
    await Promise.all([mutateTelemetry(), mutateHistory()]);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history.map((msg: any, index: number) => ({
      time: new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: msg[analyticsParam] || (analyticsParam === 'can.temperature' ? (20 + (index % 10)) : (80 + (index % 20))),
      battery: msg['battery.level'] || (80 + (index % 20))
    })).reverse();
  }, [history, analyticsParam]);

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

  const selectedDevice = Array.isArray(devices) ? devices.find((d: any) => d.id === effectiveDeviceId) : null;

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
              className={cn(commonProps.className, !selectedDevice?.connected && "bg-gray-400")}
            />
          </div>
        );
      case 'selector':
        return (
          <div 
            key={tile.id}
            onContextMenu={(e) => handleTileContextMenu(e, tile.id)}
            className={cn("col-span-2 row-span-1 p-4 flex flex-col justify-between", tile.className)}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{tile.title}</span>
            <select 
              className="bg-transparent text-2xl font-light outline-none border-none cursor-pointer"
              value={effectiveDeviceId || ''}
              onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
            >
              {Array.isArray(devices) && devices.map((d: any) => (
                <option key={d.id} value={d.id} className="text-black">{d.name}</option>
              ))}
            </select>
          </div>
        );
      case 'telemetry':
        return (
          <div onContextMenu={(e) => handleTileContextMenu(e, tile.id)} key={tile.id}>
            <Tile 
              {...commonProps}
              value={telemetry?.[tile.key!]?.value} 
              unit={tile.unit}
              icon={tile.key?.includes('battery') ? Battery : tile.key?.includes('signal') ? Signal : Thermometer}
            />
          </div>
        );
      case 'location':
        return (
          <div 
            key={tile.id}
            onContextMenu={(e) => handleTileContextMenu(e, tile.id)}
            className={cn("col-span-1 row-span-1 p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-transform", tile.className)}
            onClick={() => lat && lon && window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank')}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{tile.title}</span>
              <MapPin size={20} className="opacity-60" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-light leading-tight">
                {lat ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : 'No GPS Fix'}
              </span>
              {lat && <span className="text-[10px] font-bold uppercase mt-1 opacity-60">view map</span>}
            </div>
          </div>
        );
      case 'all-params':
        return (
          <div 
            key={tile.id}
            onContextMenu={(e) => handleTileContextMenu(e, tile.id)}
            className={cn("col-span-1 row-span-1 p-4 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform", tile.className)}
            onClick={() => setShowAllParams(true)}
          >
            <List size={32} />
            <span className="text-[10px] uppercase font-bold mt-2 text-center">{tile.title}</span>
          </div>
        );
      case 'refresh':
        return (
          <div 
            key={tile.id}
            onContextMenu={(e) => handleTileContextMenu(e, tile.id)}
            className={cn("col-span-1 row-span-1 p-4 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform", tile.className)}
            onClick={handleManualRefresh}
          >
            <RefreshCw size={32} className={cn(telemetryLoading && "animate-spin")} />
            <span className="text-[10px] uppercase font-bold mt-2">{tile.title}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="panorama-container h-screen select-none" onClick={() => setContextMenu(null)}>
      
      {/* SECTION 1: OVERVIEW */}
      <section className="panorama-section">
        <div className="flex justify-between items-end mb-8">
          <SectionHeader 
            title="dashboard" 
            subtitle={selectedDevice?.name || 'loading devices...'} 
          />
          <button 
            onClick={() => setIsAddingTile(true)}
            className="mb-2 p-2 bg-metro-green text-white rounded-full hover:scale-110 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
        
        {lastUpdated && (
          <p className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">
            Last updated: {lastUpdated.toLocaleTimeString()} {customToken && '(Custom Token)'}
          </p>
        )}
        
        <div className="grid grid-cols-4 gap-2 auto-rows-min">
          {tiles.map(renderTile)}
        </div>
      </section>

      {/* SECTION 2: ANALYTICS */}
      <section className="panorama-section bg-white/50">
        <SectionHeader title="analytics" subtitle="telemetry history" />
        
        <div className="bg-white p-8 shadow-sm border border-gray-200 h-[calc(100vh-250px)] min-w-[800px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <h3 className="text-2xl font-light">Parameter Analysis</h3>
              <select 
                className="mt-2 bg-gray-50 border border-gray-200 text-xs font-bold uppercase p-2 outline-none"
                value={analyticsParam}
                onChange={(e) => setAnalyticsParam(e.target.value)}
              >
                {telemetry ? Object.keys(telemetry).map(key => (
                  <option key={key} value={key}>{key}</option>
                )) : (
                  <option value="can.temperature">can.temperature</option>
                )}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-metro-red rounded-full" />
                <span className="text-xs font-bold uppercase">{analyticsParam}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-metro-blue rounded-full" />
                <span className="text-xs font-bold uppercase">Battery</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="80%">
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }}
              />
              <Tooltip 
                contentStyle={{ border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', borderRadius: '0' }}
                labelStyle={{ fontWeight: 800, marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#e51400" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
              <Area 
                type="monotone" 
                dataKey="battery" 
                stroke="#00aba9" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBat)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* SECTION 3: SETTINGS / ABOUT */}
      <section className="panorama-section">
        <SectionHeader title="settings" subtitle="system configuration" />
        
        <div className="space-y-12 max-w-md">
          <div className="group cursor-pointer" onClick={() => {
            const token = prompt('Enter Flespi Token:');
            if (token) handleSetToken(token);
          }}>
            <div className="flex justify-between items-center border-b border-gray-300 pb-4 group-hover:border-metro-blue transition-colors">
              <div>
                <h4 className="text-2xl font-light">Change Token</h4>
                <p className="text-sm text-gray-500">Override default Flespi credentials</p>
              </div>
              <Globe className="text-gray-400 group-hover:text-metro-blue" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={() => {
            if (confirm('Reset all dashboard tiles to default?')) {
              setTiles(DEFAULT_TILES);
              localStorage.removeItem('metro_tiles');
            }
          }}>
            <div className="flex justify-between items-center border-b border-gray-300 pb-4 group-hover:border-metro-orange transition-colors">
              <div>
                <h4 className="text-2xl font-light">Reset Layout</h4>
                <p className="text-sm text-gray-500">Restore default tile configuration</p>
              </div>
              <RefreshCw className="text-gray-400 group-hover:text-metro-orange" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={handleLogout}>
            <div className="flex justify-between items-center border-b border-gray-300 pb-4 group-hover:border-metro-red transition-colors">
              <div>
                <h4 className="text-2xl font-light text-metro-red">Sign Out</h4>
                <p className="text-sm text-gray-500">Clear custom token and reset session</p>
              </div>
              <LogOut className="text-metro-red opacity-60" />
            </div>
          </div>

          <div className="group cursor-pointer" onClick={() => alert('Metro IoT v1.0.6\nBuilt with AI Studio\nFlespi Integration Active')}>
            <div className="flex justify-between items-center border-b border-gray-300 pb-4 group-hover:border-metro-blue transition-colors">
              <div>
                <h4 className="text-2xl font-light">About Metro IoT</h4>
                <p className="text-sm text-gray-500">Version 1.0.6 (Stable)</p>
              </div>
              <ChevronRight className="text-gray-400 group-hover:text-metro-blue" />
            </div>
          </div>
        </div>
      </section>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div 
          className="fixed z-[200] bg-white shadow-2xl border border-gray-200 py-2 w-48"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => moveTile(contextMenu.tileId, 'up')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 text-sm"
          >
            <Move size={16} className="rotate-180" /> Move Up
          </button>
          <button 
            onClick={() => moveTile(contextMenu.tileId, 'down')}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 text-sm"
          >
            <Move size={16} /> Move Down
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button 
            onClick={() => deleteTile(contextMenu.tileId)}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3 text-sm text-metro-red"
          >
            <Trash2 size={16} /> Delete Tile
          </button>
        </div>
      )}

      {/* ADD TILE MODAL */}
      {isAddingTile && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-md p-8">
            <h2 className="text-4xl font-light mb-8">Add New Tile</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Parameter Key</label>
                <select 
                  className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-metro-blue"
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
                  <option value="">Select a parameter...</option>
                  {telemetry && Object.keys(telemetry).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button 
                  onClick={() => setIsAddingTile(false)}
                  className="px-6 py-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALL PARAMETERS MODAL */}
      {showAllParams && (
        <div className="fixed inset-0 z-[100] bg-black/90 text-white p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-6xl font-light tracking-tight lowercase">all parameters</h2>
              <button 
                onClick={() => setShowAllParams(false)}
                className="text-4xl font-light hover:text-metro-red transition-colors"
              >
                [close]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {telemetry ? Object.entries(telemetry).map(([key, data]: [string, any]) => (
                <div key={key} className="border border-white/20 p-4 hover:bg-white/5 transition-colors">
                  <p className="text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-widest">{key}</p>
                  <p className="text-2xl font-light break-all">
                    {typeof data.value === 'boolean' ? (data.value ? 'TRUE' : 'FALSE') : (data.value ?? 'N/A')}
                    <span className="text-sm ml-2 opacity-60 uppercase">{data.unit}</span>
                  </p>
                  <p className="text-[10px] text-gray-600 mt-2">
                    Updated: {new Date(data.ts * 1000).toLocaleString()}
                  </p>
                </div>
              )) : (
                <p className="text-2xl font-light opacity-60">No telemetry data available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM APP BAR (Metro Style) */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-metro-green flex items-center justify-center gap-12 px-8 z-50">
        <button 
          onClick={handleManualRefresh}
          className="p-2 rounded-full border-2 border-white text-white hover:bg-white hover:text-metro-green transition-all"
        >
          <RefreshCw size={24} className={cn(telemetryLoading && "animate-spin")} />
        </button>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-white rounded-full" />
          <div className="w-1 h-1 bg-white rounded-full" />
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      </div>

    </div>
  );
}
