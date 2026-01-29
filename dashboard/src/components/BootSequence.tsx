'use client';

import { useState, useEffect } from 'react';

interface BootSequenceProps {
    onComplete: () => void;
}

export const BootSequence = ({ onComplete }: BootSequenceProps) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [showSkip, setShowSkip] = useState(false);

    useEffect(() => {
        // Check local storage for persistent "visited" state
        const hasBooted = localStorage.getItem('skr_booted');
        if (hasBooted) {
            onComplete();
            return;
        }

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
                setLogs(prev => [...prev, `[ OK ] ${sequence[i]}`]);
                i++;
                // showSkip is now true by default to allow immediate bypass
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    localStorage.setItem('skr_booted', 'true');
                    onComplete();
                }, 800);
            }
        }, 400);

        return () => clearInterval(interval);
    }, [onComplete]);

    const handleSkip = () => {
        localStorage.setItem('skr_booted', 'true');
        onComplete();
    };

    return (
        <main className="crt-effect flex items-center justify-center min-h-screen bg-black font-mono text-[#00ff41] p-4 text-xs relative">
            <div className="space-y-4 max-w-sm w-full">
                <div className="text-4xl font-black italic glow-text mb-8 animate-pulse text-center">SKR_FLY_WHEEL</div>
                <div className="space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-left duration-200">{log}</div>
                    ))}
                    <div className="animate-pulse">_</div>
                </div>
            </div>

            <button
                onClick={handleSkip}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 md:bottom-10 md:right-10 md:left-auto md:translate-x-0 text-[10px] opacity-60 hover:opacity-100 hover:text-white transition-opacity border border-[#00ff41]/40 px-6 py-3 md:px-3 md:py-1 uppercase tracking-widest bg-black/50 backdrop-blur-sm z-50"
            >
                [ SKIP_BOOT_SEQUENCE ]
            </button>
        </main>
    );
};
