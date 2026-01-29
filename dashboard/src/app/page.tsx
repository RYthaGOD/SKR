'use client';

// Force Rebuild: v1.3.0 Refactor
export const dynamic = 'force-dynamic';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Flame } from 'lucide-react';

import { BootSequence } from '@/components/BootSequence';
import { Terminal } from '@/components/Terminal';
import { StatsCard } from '@/components/StatsCard';
import { useStats } from '@/hooks/useStats';
import { useClaim } from '@/hooks/useClaim';
import { useShieldedBalance } from '@/hooks/useShieldedBalance';
import { ShieldButton } from '@/components/Privacy/ShieldButton';
import { UnshieldButton } from '@/components/Privacy/UnshieldButton';
import { CliHelper } from '@/components/Privacy/CliHelper'; // Added
import { ISG_MINT, APP_VERSION, BUILD_TIMESTAMP } from '@/config/constants';

export default function Home() {
  const { publicKey } = useWallet();
  const [logs, setLogs] = useState<string[]>([]);
  const [isBooting, setIsBooting] = useState(true);

  const { stats, cycleProgress } = useStats();
  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);
  const { state: claimState, checkEligibility, handleClaim } = useClaim(addLog);
  const { balance: shieldedBalance, loading: shieldingLoading } = useShieldedBalance();

  // Boot Handler
  const handleBootComplete = () => setIsBooting(false);

  // Eligibility Check Loop
  useEffect(() => {
    if (publicKey && !isBooting) {
      checkEligibility(publicKey.toBase58());
      const interval = setInterval(() => checkEligibility(publicKey.toBase58()), 15000);
      return () => clearInterval(interval);
    }
  }, [publicKey, isBooting, stats?.vaultSkr]);

  if (isBooting) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return (
    <main className="min-h-screen bg-black text-[#00ff41] font-mono selection:bg-[#00ff41] selection:text-black p-4 md:p-8 pb-safe pt-safe flex flex-col gap-6 relative overflow-hidden">
      {/* Background Matrix/Grid Effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center z-50 relative border-b border-[#00ff41]/20 pb-4 gap-4">
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase glitch-text text-center md:text-left" data-text="SKR_Flywheel">
            SKR_Flywheel <span className="text-sm align-top text-[#00ff41] border border-[#00ff41] px-1 rounded ml-2">v{APP_VERSION}</span>
          </h1>
          <div className="flex gap-4 text-[10px] opacity-60 tracking-widest mt-1">
            <span>SYS_STATUS: <span className={stats?.cycleParams?.status === "IDLE" ? "text-yellow-400" : "text-[#00ff41] animate-pulse"}>{stats?.cycleParams?.status || "OFFLINE"}</span></span>
            <span>NET: MAINNET-BETA</span>
            <span className="text-[#00ff41]/50">| BLD: {BUILD_TIMESTAMP}</span>
          </div>
        </div>
        <div className="hover:scale-105 transition-transform">
          <WalletMultiButton className="!bg-[#00ff41] !text-black hover:!bg-[#00cc33] !font-bold !rounded-none !uppercase !text-xs !px-6 !py-3 !h-auto transition-all" />
        </div>
      </header>

      {/* MAIN DASHBOARD GRID */}
      {/* Mobile UX: Stack columns (grid-cols-1) by default, md:grid-cols-4 for desktop */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 z-10">

        {/* ISG CA Banner */}
        <div className="md:col-span-4 border-terminal p-3 flex flex-col md:flex-row items-center justify-between bg-[#001100]/50 backdrop-blur-sm group hover:border-[#00ff41]/50 transition-colors gap-2">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-start text-center md:text-left">
            <div className="bg-[#00ff41]/10 px-2 py-1 rounded text-[9px] font-black tracking-widest text-[#00ff41]">ISG_MINT</div>
            <code className="text-[10px] font-bold tracking-tight text-[#00ff41]/80 select-all font-mono break-all">
              {ISG_MINT}
            </code>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
            <span className="hidden md:inline text-[8px] opacity-40 uppercase tracking-widest">Fee_Generator_Contract</span>
            <button
              onClick={() => navigator.clipboard.writeText(ISG_MINT)}
              className="hover:bg-[#00ff41] hover:text-black px-4 py-2 md:px-2 md:py-1 transition-colors text-[9px] font-bold border border-[#00ff41]/20 hover:border-transparent uppercase min-h-[30px]"
            >
              [ COPY ]
            </button>
          </div>
        </div>

        {/* 1. SKR PRICE */}
        <StatsCard
          label="SKR_PRICE_SOL"
          value={stats?.skrPriceSol?.toFixed(8) || "0.00000000"}
          subLabel="MARKET_VALUE_REALTIME"
          icon={ArrowUpRight}
        />

        {/* 2. ISG BURNED */}
        <StatsCard
          label="TOTAL_ISG_INCINERATED"
          value={stats?.analytics?.totalBurned?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
          subLabel="DESTRUCTION_COMPLETE"
          icon={Flame}
          valueColor="text-red-500/80"
          iconColor="text-red-500"
        />

        {/* 3. VAULT SOL RESERVE */}
        <StatsCard
          label="VAULT_SOL_RESERVE"
          value={(stats?.vaultSol?.toFixed(4) || "0.0000") + " SOL"}
          subLabel="FUEL_RODS_ACTIVE"
        />

        {/* 4. TOTAL DISTRIBUTED */}
        <StatsCard
          label="SKR_DISTRIBUTED"
          value={(stats?.analytics?.totalDistributed?.toLocaleString() || "0") + " SKR"}
          subLabel="REWARDS_CIRCULATING"
        />

      </div>


      {/* MID HUD: TERMINAL & MANUAL */}
      {/* Mobile: Stack vertical */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 z-10">

        {/* Terminal Output */}
        <Terminal logs={logs} progress={cycleProgress} stats={stats} />

        {/* TOP HOLDERS & DASHBOARD CONTROLS */}
        {/* We can combine or keep separate. The original had TOP HOLDERS and HOW IT WORKS. */}

        {/* TOP HOLDERS */}
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

        {/* ACTION / INFO PANEL */}
        <div className="border-terminal p-4 bg-black/40 flex flex-col group relative overflow-hidden h-[400px]">
          {/* CLAIM BUTTON AREA (Moved here for better UX optionally, or just keep info) */}
          {/* Actually, let's keep the HOW IT WORKS but add the Claim Button clearly nearby if eligible */}

          <div className="text-[10px] font-black tracking-widest uppercase mb-4 opacity-70 border-b border-[#00ff41]/10 pb-2 flex justify-between shrink-0">
            <span>SYSTEM_PROTOCOL</span>
            <span className="text-[#00ff41] animate-pulse">ACTIVE</span>
          </div>

          {/* Claim Interface */}
          <div className="bg-[#002200] border border-[#00ff41]/30 p-3 mb-4 rounded-sm">
            <div className="flex justify-between text-[10px] mb-1 opacity-70">
              <span>PENDING_ALLOCATION:</span>
              <span>{claimState.loading ? "CALCULATING..." : claimState.points > 0 ? "ELIGIBLE" : "NO_SHARES"}</span>
            </div>
            <div className="text-2xl font-black text-white mb-2">
              {claimState.amount.toFixed(2)} <span className="text-xs text-[#00ff41]">SKR</span>
            </div>

            <button
              onClick={handleClaim}
              disabled={!claimState.claimable || claimState.loading}
              className={`w-full py-3 font-black text-xs uppercase tracking-widest transition-all
                        ${claimState.claimable && !claimState.loading
                  ? "bg-[#00ff41] text-black hover:bg-[#00cc33] hover:scale-[1.02]"
                  : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"}
                    `}
            >
              {claimState.loading ? "PROCESSING_TRANSACTION..." :
                !publicKey ? "CONNECT_WALLET_REQUIRED" :
                  claimState.claimable ? "[ INITIATE_CLAIM_SEQUENCE ]" :
                    "INSUFFICIENT_YIELD"}
            </button>
          </div>


          <div className="flex-1 space-y-4 text-[10px] relative z-10 overflow-y-auto custom-scrollbar pr-2 opacity-60 hover:opacity-100 transition-opacity">
            {/* Reusing existing text content but simplified */}
            <p>1. <span className="text-[#00ff41] font-bold">FUEL:</span> Fees from Pump.fun trades.</p>
            <p>2. <span className="text-[#00ff41] font-bold">BUYBACK:</span> System automates SKR acquisition.</p>
            <p>3. <span className="text-[#00ff41] font-bold">BURN:</span> Claiming SKR requires burning ISG entropy.</p>

            <div className="pt-2 border-t border-[#00ff41]/10 mt-2">
              <div className="text-[#00ff41] font-bold mb-1 flex justify-between items-center">
                <span>PRIVACY_UPGRADE (Light V1)</span>
                <span className="text-[9px] opacity-50">{shieldingLoading ? "SCANNING_ZK_STATE..." : `ZK_BALANCE: ${shieldedBalance?.toFixed(2) || "0.00"}`}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <ShieldButton balance={claimState.amount || 0} />
                <UnshieldButton balance={shieldedBalance || 0} />
              </div>
              <CliHelper type="shield" amount={Math.floor(claimState.amount || 0)} balance={claimState.amount || 0} />
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
