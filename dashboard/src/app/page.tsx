'use client';
// Force Rebuild: v1.2.1 Timestamp CHECK
export const dynamic = 'force-dynamic';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { ArrowUpRight, Activity, Flame } from 'lucide-react';

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
  const [progress, setProgress] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState<string[]>([]);

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

  // Boot Sequence
  useEffect(() => {
    const sequence = [
      "INITIALIZING_CORE...",
      "AUTHENTICATING_SKR_NODE...",
      "SYNCING_MAINNET_ALPHA...",
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

  // Cycle Progress
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


  // Fetch Eligibility periodically
  useEffect(() => {
    if (publicKey) {
      checkEligibility(publicKey.toBase58());
      const interval = setInterval(() => checkEligibility(publicKey.toBase58()), 15000);
      return () => clearInterval(interval);
    }
  }, [publicKey, stats?.vaultSkr]);

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
    addLog(`[DEBUG] Claim Button Clicked.`);
    if (!publicKey) {
      addLog(`[ERROR] Wallet not connected.`);
      return;
    }

    addLog(`[DEBUG] Wallet: ${publicKey.toBase58().slice(0, 8)}...`);

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

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server Error (${res.status}): ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addLog(`Burn Required: ${data.burnAmount} ISG`);
      addLog(`Awaiting User Signature...`);

      // 2. Deserialize & Send
      const transactionBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      const connection = new Connection("https://api.mainnet-beta.solana.com");
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
    <main className="min-h-screen bg-black text-[#00ff41] font-mono selection:bg-[#00ff41] selection:text-black p-4 md:p-8 flex flex-col gap-6 relative overflow-hidden">
      {/* Background Matrix/Grid Effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>

      {/* HEADER */}
      <header className="flex justify-between items-center z-50 relative border-b border-[#00ff41]/20 pb-4">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase glitch-text" data-text="SKR_Flywheel">
            SKR_Flywheel <span className="text-sm align-top text-[#00ff41] border border-[#00ff41] px-1 rounded ml-2">v1.2.1</span>
          </h1>
          <div className="flex gap-4 text-[10px] opacity-60 tracking-widest mt-1">
            <span>SYS_STATUS: <span className={stats?.cycleParams?.status === "IDLE" ? "text-yellow-400" : "text-[#00ff41] animate-pulse"}>{stats?.cycleParams?.status || "OFFLINE"}</span></span>
            <span>NET: MAINNET-BETA</span>
          </div>
        </div>
        <WalletMultiButton className="!bg-[#00ff41] !text-black hover:!bg-[#00cc33] !font-bold !rounded-none !uppercase !text-xs !px-6 !h-10 transition-all hover:scale-105" />
      </header>

      {/* MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 z-10">

        {/* ISG CA Banner */}
        <div className="md:col-span-4 border-terminal p-2 md:p-3 flex flex-col md:flex-row items-center justify-between bg-[#001100]/50 backdrop-blur-sm group hover:border-[#00ff41]/50 transition-colors gap-2">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="bg-[#00ff41]/10 px-2 py-1 rounded text-[9px] font-black tracking-widest text-[#00ff41]">ISG_MINT</div>
            <code className="text-[10px] font-bold tracking-tight text-[#00ff41]/80 select-all font-mono break-all md:break-normal">
              BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump
            </code>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="hidden md:inline text-[8px] opacity-40 uppercase tracking-widest">Fee_Generator_Contract</span>
            <button
              onClick={() => navigator.clipboard.writeText("BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump")}
              className="hover:bg-[#00ff41] hover:text-black px-2 py-1 transition-colors text-[9px] font-bold border border-[#00ff41]/20 hover:border-transparent"
            >
              [ COPY ]
            </button>
          </div>
        </div>

        {/* 1. SKR PRICE */}
        <div className="border-terminal p-4 flex flex-col justify-between stat-card group min-h-[120px]">
          <div className="flex justify-between items-start">
            <div className="text-[9px] opacity-40 uppercase tracking-tighter">SKR_PRICE_SOL</div>
            <ArrowUpRight className="w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-black italic">
            {stats?.skrPriceSol?.toFixed(8) || "0.00000000"}
          </div>
          <div className="text-[8px] opacity-30 mt-2">MARKET_VALUE_REALTIME</div>
        </div>

        {/* 2. ISG BURNED (NEW) */}
        <div className="border-terminal p-4 flex flex-col justify-between stat-card group min-h-[120px]">
          <div className="flex justify-between items-start">
            <div className="text-[9px] opacity-40 uppercase tracking-tighter">TOTAL_ISG_INCINERATED</div>
            <Flame className="w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity text-red-500" />
          </div>
          <div className="text-3xl font-black italic text-red-500/80">
            {stats?.analytics?.totalBurned?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
          </div>
          <div className="text-[8px] opacity-30 mt-2">DESTRUCTION_COMPLETE</div>
        </div>

        {/* 3. VAULT SOL RESERVE */}
        <div className="border-terminal p-4 flex flex-col justify-between stat-card group min-h-[120px]">
          <div className="flex justify-between items-start">
            <div className="text-[9px] opacity-40 uppercase tracking-tighter">VAULT_SOL_RESERVE</div>
          </div>
          <div className="text-3xl font-black italic text-[#00ff41]">
            {stats?.vaultSol?.toFixed(4) || "0.0000"} <span className="text-xs opacity-50">SOL</span>
          </div>
          <div className="text-[8px] opacity-30 mt-2">FUEL_RODS_ACTIVE</div>
        </div>

        {/* 4. TOTAL DISTRIBUTED / VAULT HOLDINGS */}
        <div className="border-terminal p-4 flex flex-col justify-between stat-card group min-h-[120px]">
          <div className="flex justify-between items-start">
            <div className="text-[9px] opacity-40 uppercase tracking-tighter">SKR_DISTRIBUTED</div>
          </div>
          <div className="text-3xl font-black italic text-[#00ff41]">
            {stats?.analytics?.totalDistributed?.toLocaleString() || "0"} <span className="text-xs opacity-50">SKR</span>
          </div>
          <div className="text-[8px] opacity-30 mt-2">REWARDS_CIRCULATING</div>
        </div>

      </div>


      {/* MID HUD: TERMINAL & MANUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 z-10">

        {/* Terminal Output */}
        <div className="lg:col-span-2 border-terminal relative overflow-hidden bg-black/60 shadow-[inset_0_0_40px_rgba(0,255,65,0.05)] h-[400px] flex flex-col">
          <div className="terminal-header px-4 py-2 flex justify-between items-center text-[9px] font-black uppercase tracking-widest opacity-80 border-b border-[#00ff41]/20 bg-black/80">
            <span>[ FLYWHEEL_CORE_STREAMS ]</span>
            <span className="flex items-center gap-4">
              <span>CYCLES: {stats?.cycleParams?.count || 0}</span>
              <span className="flex items-center gap-2">
                BUFFER: {stats?.vaultSol?.toFixed(4)} SOL
                <div className="w-1.5 h-1.5 bg-[#00ff41] animate-pulse"></div>
              </span>
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-1.5 font-mono text-xs">
            {stats?.cycleParams?.logs?.map((log: string, i: number) => {
              const isSystem = log.includes("[SYSTEM]");
              const isClaim = log.includes("Burned") || log.includes("Claiming");
              const isError = log.includes("Error");
              return (
                <div key={i} className={`flex gap-3 leading-relaxed animate-in fade-in duration-500 ${isSystem ? 'text-white/80 font-bold' : isClaim ? 'text-[#00ff41]' : isError ? 'text-red-500' : 'opacity-70'}`}>
                  <span className="opacity-20 text-[10px] pt-0.5 select-none">{(stats.cycleParams.logs.length - i).toString().padStart(3, '0')}</span>
                  <span>{log}</span>
                </div>
              );
            })}
            <div className="animate-pulse">_</div>
          </div>

          {/* Progress Slider */}
          <div className="w-full h-[2px] bg-[#00ff41]/5">
            <div className="h-full bg-[#00ff41] shadow-[0_0_10px_#00ff41]" style={{ width: `${progress}%`, transition: 'width 1s linear' }}></div>
          </div>
        </div>

        {/* TOP HOLDERS (Moved) */}
        <div className="border-terminal p-4 flex flex-col gap-2 h-[400px]">
          <div className="flex justify-between items-center border-b border-[#00ff41]/20 pb-2 mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">TOP_HOLDERS</span>
            <span className="text-[8px] bg-[#00ff41]/10 text-[#00ff41] px-1 rounded animate-pulse">LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {stats?.analytics?.leaderboard?.map((h: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-[10px] bg-white/5 p-2 border border-white/5 hover:border-[#00ff41]/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#00ff41] w-4 opacity-50">#{i + 1}</span>
                  <span className="font-mono opacity-80">{h.address}</span>
                </div>
                <div className="font-bold tracking-tight">{h.points?.toLocaleString()} ISG</div>
              </div>
            ))}
            {(!stats?.analytics?.leaderboard || stats.analytics.leaderboard.length === 0) && (
              <div className="text-center opacity-30 text-[9px] py-4">SCANNING_DISTRIBUTION_NODES...</div>
            )}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="border-terminal p-4 bg-black/40 flex flex-col group relative overflow-hidden h-[400px]">
          {/* Background tech deco */}
          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="#00ff41">
              <path d="M0 0 L100 100 M100 0 L0 100" strokeWidth="0.5" />
              <rect x="25" y="25" width="50" height="50" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="text-[10px] font-black tracking-widest uppercase mb-4 opacity-70 border-b border-[#00ff41]/10 pb-2 flex justify-between shrink-0">
            <span>HOW IT WORKS (SYSTEM PROTOCOL)</span>
            <span className="text-[#00ff41] animate-pulse">v1.0.0</span>
          </div>

          <div className="flex-1 space-y-4 text-[10px] relative z-10 overflow-y-auto custom-scrollbar pr-2">
            <div className="flex gap-3 text-left">
              <div className="font-black text-[#00ff41] bg-[#00ff41]/10 h-5 w-5 min-w-[1.25rem] flex items-center justify-center rounded-sm text-[9px] shrink-0">1</div>
              <div className="flex-1">
                <div className="font-bold opacity-80 mb-0.5">FUEL_INJECTION (FEES)</div>
                <div className="opacity-50 leading-relaxed text-[9px]">Market trades on Pump.fun generate fee revenue. These fees are the community's fuel.</div>
              </div>
            </div>

            <div className="flex gap-3 text-left">
              <div className="font-black text-[#00ff41] bg-[#00ff41]/10 h-5 w-5 min-w-[1.25rem] flex items-center justify-center rounded-sm text-[9px] shrink-0">2</div>
              <div className="flex-1">
                <div className="font-bold opacity-80 mb-0.5">AUTO_ACQUISITION (BUYBACK)</div>
                <div className="opacity-50 leading-relaxed text-[9px]">The Flywheel claims fees to buy SKR tokens from the open market, filling the Vault.</div>
              </div>
            </div>

            <div className="flex gap-3 text-left">
              <div className="font-black text-[#00ff41] bg-[#00ff41]/10 h-5 w-5 min-w-[1.25rem] flex items-center justify-center rounded-sm text-[9px] shrink-0">3</div>
              <div className="flex-1">
                <div className="font-bold opacity-80 mb-0.5">YIELD_CALCULATION (SNAPSHOT)</div>
                <div className="opacity-50 leading-relaxed text-[9px]">At the end of each cycle, your share of the Vault is calculated based on your ISG holdings.</div>
              </div>
            </div>

            <div className="flex gap-3 text-left">
              <div className="font-black text-[#00ff41] bg-[#00ff41]/10 h-5 w-5 min-w-[1.25rem] flex items-center justify-center rounded-sm text-[9px] shrink-0">4</div>
              <div className="flex-1">
                <div className="font-bold opacity-80 mb-0.5">ENTROPY_BURN (CLAIM)</div>
                <div className="opacity-50 leading-relaxed text-[9px]">Claim your SKR rewards. <span className="text-red-500 font-bold">COST:</span> You burn a tiny amount of ISG to make everyone else's tokens rarer.</div>
              </div>
            </div>

            <div className="flex gap-3 text-left mt-2 pt-2 border-t border-[#00ff41]/10">
              <div className="font-black text-black bg-[#00ff41] h-5 w-5 min-w-[1.25rem] flex items-center justify-center rounded-sm text-[9px] animate-pulse shrink-0">!</div>
              <div className="flex-1">
                <div className="font-bold opacity-100 text-[#00ff41] mb-0.5">LATEST_HARVEST_VALUE</div>
                <div className="opacity-80 leading-relaxed text-[10px] font-mono">
                  {stats?.lastBuybackAmount ? stats.lastBuybackAmount.toFixed(4) : "0.0000"} SOL
                </div>
              </div>
            </div>
          </div>

          {/* Vault Capacitance Small HUD (Preserved) */}
          <div className="mt-4 pt-4 border-t border-[#00ff41]/10 space-y-3 relative z-10 shrink-0">
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

      <style jsx global>{`
        .glow-text-red {
          text-shadow: 0 0 10px rgba(255, 0, 0, 0.4), 0 0 20px rgba(255, 0, 0, 0.2);
        }
        @keyframes dash { to { stroke-dashoffset: -50; } }
      `}</style>
    </main>
  );
}
