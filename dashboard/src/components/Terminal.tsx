import React from 'react';

interface TerminalProps {
    logs: string[];
    progress: number;
    stats: any;
}

export const Terminal = ({ logs, progress, stats }: TerminalProps) => {
    return (
        <div className="lg:col-span-2 border-terminal relative overflow-hidden bg-black/60 shadow-[inset_0_0_40px_rgba(0,255,65,0.05)] h-[300px] md:h-[400px] flex flex-col">
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
                {logs.map((log: string, i: number) => {
                    const isSystem = log.includes("[SYSTEM]");
                    const isClaim = log.includes("Burned") || log.includes("Claiming") || log.includes("Shield");
                    const isError = log.includes("Error");
                    return (
                        <div key={i} className={`flex gap-3 leading-relaxed animate-in fade-in duration-500 ${isSystem ? 'text-white/80 font-bold' : isClaim ? 'text-[#00ff41]' : isError ? 'text-red-500' : 'opacity-70'}`}>
                            <span className="opacity-20 text-[10px] pt-0.5 select-none md:block hidden">{(logs.length - i).toString().padStart(3, '0')}</span>
                            <span className="break-all">{log}</span>
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
    );
};
