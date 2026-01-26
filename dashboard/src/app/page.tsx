'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

interface ClaimState {
  points: number;
  amount: number;
  claimable: boolean;
  loading: boolean;
  txHash?: string;
  error?: string;
}

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();
  const [state, setState] = useState<ClaimState>({
    points: 0,
    amount: 0,
    claimable: false,
    loading: false
  });
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  // Fetch Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Stats fetch failed", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Eligibility periodically
  useEffect(() => {
    if (publicKey) {
      checkEligibility(publicKey.toBase58());
      const interval = setInterval(() => checkEligibility(publicKey.toBase58()), 15000);
      return () => clearInterval(interval);
    }
  }, [publicKey, stats?.vaultSkr]); // Refresh if wallet changes OR if bot buys back more SKR

  const checkEligibility = async (address: string) => {
    setState(prev => ({ ...prev, loading: true }));
    addLog(`Analyzing wallet: ${address}...`);

    try {
      const res = await fetch(`/api/balance/${address}`);
      const data = await res.json();

      setState({
        points: data.points,
        amount: data.amount,
        claimable: data.claimable,
        loading: false
      });

      if (data.points > 0) {
        addLog(`Eligible Shares Detected: ${data.points} pts`);
        addLog(`Estimated SKR Allocation: ${data.amount.toFixed(2)} SKR`);
      } else {
        addLog(`No eligible shares found.`);
      }

    } catch (e) {
      addLog(`Connection Failed: Flywheel Node Offline?`);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleClaim = async () => {
    if (!publicKey) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      addLog(`Initiating Claim Protocol...`);
      addLog(`Calculating 20% Burn Value (ISG)...`);

      // 1. Request Transaction
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey.toBase58() })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addLog(`Burn Required: ${data.burnAmount} ISG`);
      addLog(`Awaiting User Signature...`);

      // 2. Deserialize & Send
      const transactionBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      // Send (Wallet signs as Payer + Burn Owner)
      // Note: Use a connection object that points to real RPC used in frontend (Mainnet)
      const connection = new Connection("https://api.mainnet-beta.solana.com"); // Ideally from config
      const signature = await sendTransaction(transaction, connection);

      addLog(`Transaction Sent: ${signature.slice(0, 8)}...`);
      addLog(`Verifying...`);

      await connection.confirmTransaction(signature, 'confirmed');

      addLog(`SUCCESS. Tokens Claimed.`);
      addLog(`ISG Burned for Entropy.`);

      setState(prev => ({ ...prev, loading: false, txHash: signature }));

    } catch (e: any) {
      console.error(e);
      addLog(`ERROR: ${e.message}`);
      setState(prev => ({ ...prev, loading: false, error: e.message }));
    }
  };

  // Calculate Progress Percent
  const [progress, setProgress] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState<string[]>([]);

  useEffect(() => {
    const sequence = [
      "INITIALIZING_CORE...",
      "AUTHENTICATING_SKR_NODE...",
      "SYNCING_MAINNET_ALPHAv0.9.9...",
      "CALIBRATING_TOPOLOGY_MAP...",
      "ESTABLISHING_DATA_LINK...",
      "PERFECTION_MODE_ACTIVE"
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setBootLogs(prev => [...prev, `[ OK ] ${sequence[i]}`]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsBooting(false), 800);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stats?.cycleParams?.nextCycle) return;
    const updateProgress = () => {
      const total = 5 * 60 * 1000; // 5 mins
      const elapsed = Date.now() - stats.cycleParams.lastCycle;
      const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
      setProgress(percent);
    };
    updateProgress();
    const pInterval = setInterval(updateProgress, 1000);
    return () => clearInterval(pInterval);
  }, [stats]);

  const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
    return (
      <svg className="w-16 h-8 opacity-40 group-hover:opacity-100 transition-opacity" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="#00ff41" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  if (isBooting) {
    return (
      <main className="crt-effect flex items-center justify-center min-h-screen bg-black font-mono text-[#00ff41] p-4 text-xs">
        <div className="space-y-4 max-w-sm w-full">
          <div className="text-4xl font-black italic glow-text mb-8 animate-pulse text-center">SKR_FLY_WHEEL</div>
          <div className="space-y-1">
            {bootLogs.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left duration-200">{log}</div>)}
            <div className="animate-pulse">_</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="crt-effect flex flex-col items-center justify-center min-h-screen p-2 md:p-6 bg-black overflow-hidden font-mono text-[#00ff41] text-[12px]">
      <div className="sweep-line" />

      {/* Dynamic Animated Grid */}
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none bg-fluid-grid" />

      {/* God-Tier Sidebar Stats */}
      <div className="fixed top-0 left-0 h-screen w-12 border-r border-[#00ff41]/20 flex-col items-center py-8 gap-12 hidden lg:flex">
        <div className="rotate-90 whitespace-nowrap text-[8px] tracking-[1em] opacity-30 uppercase font-black">SYSTEM_PROTOCOL_v0.9.9</div>
        <div className="flex flex-col gap-4">
          <div className="w-1 h-1 bg-[#00ff41] rounded-full animate-ping"></div>
          <div className="w-1 h-3 bg-[#00ff41]/20 rounded-full"></div>
          <div className="w-1 h-6 bg-[#00ff41]/40 rounded-full"></div>
        </div>
      </div>

      <div className="z-10 w-full max-w-6xl space-y-4">

        {/* TOP HUD: Flow & Main Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Flow Map Visualization */}
          <div className="lg:col-span-2 border-terminal p-4 flex flex-col relative bg-black/40 group overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black tracking-widest uppercase opacity-60">Distribution_Topology</span>
              <div className="flex gap-2 items-center">
                <span className="text-[9px] animate-pulse">LIVE_FLOW</span>
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_red]"></div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[120px] relative">
              {/* SVG Flow Map */}
              <svg className="w-full h-full max-h-[140px]" viewBox="0 0 400 120">
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#00ff41" />
                  </marker>
                </defs>
                {/* Nodes */}
                <g transform={`scale(${1 + (stats?.systemPressure || 0) * 0.02})`} style={{ transformOrigin: '50% 50%' }}>
                  <rect x="25" y="40" width="70" height="35" className="fill-black stroke-[#00ff41] stroke-1 opacity-40" />
                  <text x="60" y="62" textAnchor="middle" fill="#00ff41" className="text-[10px] font-bold">FEES</text>

                  <rect x="165" y="40" width="70" height="35" className="fill-black stroke-[#00ff41] stroke-1" />
                  <text x="200" y="62" textAnchor="middle" fill="#00ff41" className="text-[10px] font-bold">BUYBACK</text>

                  <rect x="305" y="40" width="70" height="35" className="fill-black stroke-[#00ff41] stroke-1 opacity-40" />
                  <text x="340" y="62" textAnchor="middle" fill="#00ff41" className="text-[10px] font-bold">DISTRO</text>
                </g>

                {/* Paths */}
                <line x1="100" y1="57" x2="160" y2="57" stroke="#00ff41" strokeWidth="1" strokeDasharray="5,5" className="animate-[dash_10s_linear_infinite]" />
                <line x1="240" y1="57" x2="300" y2="57" stroke="#00ff41" strokeWidth="1" strokeDasharray="5,5" className="animate-[dash_10s_linear_infinite]" />

                {/* Flow Particles */}
                <circle r="2" fill="#00ff41" style={{ filter: 'drop-shadow(0 0 5px #00ff41)' }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" path="M100,57 L160,57" />
                </circle>
                <circle r="2" fill="#00ff41" style={{ filter: 'drop-shadow(0 0 5px #00ff41)' }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" path="M240,57 L300,57" begin="1.25s" />
                </circle>
              </svg>
            </div>
          </div>

          {/* Metrics Hud with Sparklines */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="border-terminal p-4 flex flex-col justify-between stat-card group">
              <div className="flex justify-between items-start">
                <div className="text-[9px] opacity-40 uppercase tracking-tighter">Total_ISG_Incinerated</div>
                <Sparkline data={stats?.history?.isgPrice || []} />
              </div>
              <div className="text-3xl font-black italic text-red-500 glow-text-red">
                {stats?.analytics?.totalBurned?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[8px] opacity-30 mt-2 flex justify-between">
                <span>DESTRUCTION_COMPLETE</span>
                <span>v{stats?.systemPressure?.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-terminal p-4 flex flex-col justify-between stat-card group">
              <div className="flex justify-between items-start">
                <div className="text-[9px] opacity-40 uppercase tracking-tighter">SKR_Buyback_Volume</div>
                <Sparkline data={stats?.history?.skrPrice || []} />
              </div>
              <div className="text-3xl font-black italic">
                {stats?.analytics?.totalDistributed?.toLocaleString() || "0"}
              </div>
              <div className="text-[8px] opacity-30 mt-2">REWARDS_CIRCULATING</div>
            </div>
          </div>
        </div>

        {/* MID HUD: TERMINAL & LEADERBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Terminal Output */}
          <div className="lg:col-span-3 border-terminal relative overflow-hidden bg-black/60 shadow-[inset_0_0_40px_rgba(0,255,65,0.05)]">
            <div className="terminal-header px-4 py-1.5 flex justify-between items-center text-[9px] font-black uppercase tracking-widest opacity-80">
              <span>[ FLYWHEEL_CORE_STREAMS ]</span>
              <span className="flex items-center gap-2">
                BUFFER: {stats?.vaultSol?.toFixed(4)} SOL
                <div className="w-1.5 h-1.5 bg-[#00ff41] animate-pulse"></div>
              </span>
            </div>

            <div className="p-4 h-[350px] overflow-y-auto custom-scrollbar space-y-1.5 relative">
              {stats?.cycleParams?.logs?.map((log: string, i: number) => {
                const isSystem = log.includes("[SYSTEM]");
                const isClaim = log.includes("Burned");
                return (
                  <div key={i} className={`flex gap-3 leading-relaxed animate-in fade-in duration-500 ${isSystem ? 'text-white/80 font-bold' : isClaim ? 'text-red-400' : 'opacity-70'}`}>
                    <span className="opacity-20 text-[9px] pt-0.5">{(stats.cycleParams.logs.length - i).toString().padStart(3, '0')}</span>
                    <span className="text-[11px]">{log}</span>
                  </div>
                );
              })}
              <div className="animate-pulse">_</div>
            </div>

            {/* Progress Slider */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#00ff41]/5">
              <div className="h-full bg-[#00ff41] shadow-[0_0_10px_#00ff41]" style={{ width: `${progress}%`, transition: 'width 1s linear' }}></div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="border-terminal p-4 bg-black/40 flex flex-col group">
            <div className="text-[10px] font-black tracking-widest uppercase mb-4 opacity-70 border-b border-[#00ff41]/10 pb-2 flex justify-between">
              <span>Top_Operators</span>
              <span className="text-[#00ff41]">EXP</span>
            </div>
            <div className="flex-1 space-y-3">
              {stats?.analytics?.leaderboard?.map((h: any, i: number) => (
                <div key={i} className="flex justify-between items-center group/item cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] opacity-30">0{i + 1}</span>
                    <span className="text-[11px] font-bold tracking-tight group-hover/item:text-white transition-colors">{h.address}</span>
                  </div>
                  <span className="text-[10px] font-black italic">{h.points}</span>
                </div>
              ))}
              {(!stats?.analytics?.leaderboard || stats?.analytics?.leaderboard.length === 0) && <div className="text-[10px] opacity-20 italic">No holders tracked yet...</div>}
            </div>

            {/* Vault Capacitance Small HUD */}
            <div className="mt-8 pt-4 border-t border-[#00ff41]/10 space-y-3">
              <div className="flex justify-between text-[9px] opacity-50 uppercase tracking-widest">
                <span>Vault_Filling</span>
                <span>{stats?.vaultSkr ? ((stats.vaultSkr / 100000) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden p-[1px] border border-[#00ff41]/20">
                <div className="h-full bg-gradient-to-r from-[#003300] to-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.4)]" style={{ width: `${Math.min(100, (stats?.vaultSkr / 100000) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM HUD: CALL TO ACTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-terminal p-6 flex flex-col justify-center bg-gradient-to-r from-black to-[#001100]/40 group overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-black tracking-tighter mb-1 italic glow-text">OPERATOR_CLAIM_GATE</h2>
              <p className="text-[10px] opacity-40 uppercase tracking-[0.3em] mb-4">Connect Wallet to sync localized rewards</p>
              <div className="flex gap-4 items-center">
                <WalletMultiButton className="!bg-[#003300] !border !border-[#00ff41] !text-[#00ff41] !shadow-[0_0_15px_rgba(0,255,65,0.2)] hover:!bg-[#005500] hover:!scale-105 !transition-all !font-mono !rounded-none !uppercase !text-xs !w-fit" />
                <div className="hidden md:block text-[8px] opacity-20 max-w-[120px]">SECURED BY PUMP_PROTOCOL MAINNET_ALPHAv0.9.9</div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-full bg-[#00ff41]/5 -skew-x-12 translate-x-12 group-hover:translate-x-0 transition-transform duration-700"></div>
          </div>

          {publicKey && (
            <div className="border-terminal p-6 flex items-center justify-between gap-8 bg-[#001100]/20 animate-in slide-in-from-bottom duration-500 overflow-hidden relative">
              <div className="space-y-1 relative z-10">
                <div className="text-[9px] opacity-50 uppercase tracking-widest">Available_Harvest</div>
                <div className="text-4xl font-black italic tabular-nums">
                  {state.amount > 0 ? state.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
                  <span className="text-xs opacity-30 not-italic ml-2">SKR</span>
                </div>
              </div>

              <div className="flex-1 max-w-[180px] relative z-10">
                <button
                  onClick={handleClaim}
                  disabled={!state.claimable || state.loading}
                  className={`
                       btn-terminal w-full py-4 text-xs font-black tracking-widest
                       ${(!state.claimable || state.loading) ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:scale-105 active:scale-95'}
                     `}
                >
                  {state.loading ? 'SYNCING...' : 'INITIALIZE_HARVEST'}
                </button>
              </div>
              {/* Visual Accent */}
              <div className="absolute top-0 right-0 p-2 text-[8px] opacity-10 font-bold uppercase tracking-widest">ENCRYPTED_FLOW</div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex justify-between px-2 text-[8px] opacity-30 uppercase tracking-[0.5em] font-bold">
          <span>Lat: {progress.toFixed(2)}ms</span>
          <span>SKR_Network_Node_v0.9.9_Premium_Gated</span>
          <span>Stability: 99.98%</span>
        </div>
      </div>

      <style jsx global>{`
        .glow-text-red {
          text-shadow: 0 0 10px rgba(255, 0, 0, 0.4), 0 0 20px rgba(255, 0, 0, 0.2);
        }
        @keyframes dash { to { stroke-dashoffset: -50; } }
      `}</style>
    </main>
  );
}
