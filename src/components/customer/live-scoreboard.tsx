'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CricketMatchData } from '@/app/api/cricket/live/route';
import { Trophy, RefreshCw, X, Zap, ChevronRight, Check } from 'lucide-react';

export const LiveScoreboard: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);

  // Fetch Live Cricket Score every 10 seconds
  const { data, isLoading, isRefetching, refetch } = useQuery<{ 
    success: boolean; 
    source: string; 
    match: CricketMatchData; 
    matches?: CricketMatchData[] 
  }>({
    queryKey: ['live-cricket-score'],
    queryFn: async () => {
      const res = await fetch('/api/cricket/live');
      if (!res.ok) throw new Error('Score fetch failed');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const matchesList = data?.matches && data.matches.length > 0 ? data.matches : (data?.match ? [data.match] : []);
  const match = matchesList[selectedMatchIndex] || data?.match;

  if (isLoading || !match) {
    return (
      <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 shadow-xl animate-pulse flex items-center justify-between">
        <div className="h-10 w-24 bg-zinc-900 rounded-lg" />
        <div className="h-6 w-32 bg-zinc-900 rounded-lg" />
        <div className="h-10 w-24 bg-zinc-900 rounded-lg" />
      </div>
    );
  }

  return (
    <>
      {/* Sleek Dark Live Scoreboard Card */}
      <div className="w-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-saffron to-emerald-400" />

        {/* Card Header: LIVE badge + Tournament Name */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3 gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider ${
              match.isLive 
                ? 'bg-red-950/80 text-red-400 border border-red-800/50 animate-pulse' 
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${match.isLive ? 'bg-red-500 animate-ping' : 'bg-zinc-400'}`} />
              {match.isLive ? 'LIVE' : 'RESULT'}
            </span>
            
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide truncate">
              {match.tournament}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {data?.source && (
              <span className="hidden sm:inline-block text-[10px] font-extrabold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                {data.source}
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="text-zinc-500 hover:text-saffron transition-colors p-1 rounded-full hover:bg-zinc-800/50"
              title="Refresh Live Score"
            >
              <RefreshCw size={12} className={isRefetching ? 'animate-spin text-saffron' : ''} />
            </button>
          </div>
        </div>

        {/* Multiple Matches Switcher Bar */}
        {matchesList.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2">
            {matchesList.slice(0, 5).map((m, idx) => (
              <button
                key={m.id || idx}
                onClick={() => setSelectedMatchIndex(idx)}
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border whitespace-nowrap transition-all ${
                  selectedMatchIndex === idx
                    ? 'bg-saffron border-saffron text-white shadow-saffron'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {m.team1.shortName} vs {m.team2.shortName}
              </button>
            ))}
          </div>
        )}

        {/* Main Teams & Score Grid */}
        <div className="grid grid-cols-12 items-center gap-2">
          
          {/* Team 1 (Left) */}
          <div className="col-span-4 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-red-600/30 border border-amber-500/40 flex items-center justify-center font-extrabold text-xs text-amber-400 shadow-md flex-shrink-0">
              {match.team1.shortName.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-white tracking-wide truncate">{match.team1.shortName}</div>
              <div className="text-xl sm:text-2xl font-black text-saffron tracking-tight leading-tight">
                {match.team1.score}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {match.team1.overs}
              </div>
            </div>
          </div>

          {/* VS Divider (Center) */}
          <div className="col-span-1 flex justify-center">
            <div className="w-7 h-7 rounded-full bg-zinc-800/90 border border-zinc-700 text-zinc-400 text-[10px] font-black flex items-center justify-center shadow-inner">
              VS
            </div>
          </div>

          {/* Team 2 (Right) */}
          <div className="col-span-4 flex items-center justify-end gap-2 text-right">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-white tracking-wide truncate">{match.team2.shortName}</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight leading-tight">
                {match.team2.score}
              </div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {match.team2.overs}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center font-extrabold text-xs text-purple-300 shadow-md flex-shrink-0">
              {match.team2.shortName.slice(0, 3)}
            </div>
          </div>

          {/* Scorecard Action Button */}
          <div className="col-span-3 flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="bg-zinc-900 hover:bg-saffron text-saffron hover:text-white border border-saffron/60 text-[11px] font-extrabold px-3 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1 uppercase tracking-wider"
            >
              <span>SCORECARD</span>
            </button>
          </div>

        </div>

        {/* Live Match Sub-text Status */}
        {match.statusText && (
          <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1 text-amber-400 truncate">
              <Zap size={12} className="fill-amber-400 flex-shrink-0" />
              {match.statusText}
            </span>
            <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">Live Auto-Sync</span>
          </div>
        )}
      </div>

      {/* Detailed Scorecard Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl text-white relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-saffron" />
                <h3 className="font-extrabold text-sm text-saffron uppercase tracking-wider">
                  {match.tournament}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Match Selection Cards in Modal */}
            {matchesList.length > 1 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase">Available Live &amp; Recent Matches ({matchesList.length})</span>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
                  {matchesList.map((m, idx) => (
                    <button
                      key={m.id || idx}
                      onClick={() => setSelectedMatchIndex(idx)}
                      className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                        selectedMatchIndex === idx
                          ? 'bg-saffron/15 border-saffron text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-xs text-white">{m.tournament}</div>
                        <div className="text-[11px] font-bold text-saffron mt-0.5">
                          {m.team1.shortName} ({m.team1.score}) vs {m.team2.shortName} ({m.team2.score})
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{m.statusText}</div>
                      </div>
                      {selectedMatchIndex === idx && <Check size={16} className="text-saffron" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Active Match Overview */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex justify-around items-center text-center">
              <div>
                <div className="text-lg font-black text-saffron">{match.team1.name}</div>
                <div className="text-2xl font-extrabold text-white mt-1">{match.team1.score}</div>
                <div className="text-xs text-zinc-400 font-semibold mt-0.5">{match.team1.overs}</div>
              </div>
              <div className="text-xs font-black text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">VS</div>
              <div>
                <div className="text-lg font-black text-emerald-400">{match.team2.name}</div>
                <div className="text-2xl font-extrabold text-white mt-1">{match.team2.score}</div>
                <div className="text-xs text-zinc-400 font-semibold mt-0.5">{match.team2.overs}</div>
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center text-xs font-extrabold text-amber-400">
              {match.statusText}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-saffron hover:bg-saffron-hover text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-saffron transition-all"
            >
              Back to IPL Dhaba Menu
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveScoreboard;
