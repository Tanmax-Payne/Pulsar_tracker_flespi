'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronLeft, List, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const formatValue = (val: any): string => {
  if (val === undefined || val === null) return '--';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
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

export default function ParametersPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id;
  const [search, setSearch] = React.useState('');

  const { data: telemetry, error } = useSWR(
    deviceId ? `/api/flespi/devices/${deviceId}/telemetry` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const filteredParams = React.useMemo(() => {
    if (!telemetry) return [];
    return Object.entries(telemetry).filter(([key]) => 
      key.toLowerCase().includes(search.toLowerCase())
    );
  }, [telemetry, search]);

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div>
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-metro-blue hover:text-white transition-colors mb-4 uppercase text-xs font-bold tracking-widest"
            >
              <ChevronLeft size={16} />
              back to dashboard
            </button>
            <h1 className="text-7xl font-light tracking-tighter lowercase">
              parameters <span className="text-metro-blue">[{deviceId}]</span>
            </h1>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text"
              placeholder="search parameters..."
              className="w-full bg-[#111] border-b-2 border-white/20 py-4 pl-12 pr-4 outline-none focus:border-metro-blue transition-colors text-xl font-light"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {error && (
          <div className="bg-metro-red p-6 mb-8">
            <p className="font-bold uppercase tracking-widest">Error loading parameters</p>
            <p className="text-sm opacity-80">Please check your connection or Flespi token.</p>
          </div>
        )}

        {!telemetry && !error ? (
          <div className="flex items-center gap-4 text-2xl font-light opacity-60">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Loading telemetry data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParams.length > 0 ? filteredParams.map(([key, data]: [string, any]) => (
              <div key={key} className="bg-[#111] border border-white/10 p-6 hover:border-metro-blue transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-metro-blue group-hover:text-white transition-colors">
                    {key}
                  </span>
                  <List size={14} className="opacity-20" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light break-all">
                    {formatValue(data.value)}
                  </span>
                  {data.unit && <span className="text-sm opacity-40 uppercase font-bold">{data.unit}</span>}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[9px] uppercase font-bold text-gray-600">
                    ts: {data.ts}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-gray-600">
                    {new Date(data.ts * 1000).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10">
                <p className="text-2xl font-light opacity-40 italic">No parameters match your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
