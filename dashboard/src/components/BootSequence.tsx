'use client';

import { useState, useEffect } from 'react';

interface BootSequenceProps {
    onComplete: () => void;
}

export const BootSequence = ({ onComplete }: BootSequenceProps) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [showSkip, setShowSkip] = useState(false);

    useEffect(() => {
        // Check session storage
        const hasBooted = sessionStorage.getItem('skr_booted');
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
                // Show skip button after a few seconds
                if (i > 2) setShowSkip(true);
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    sessionStorage.setItem('skr_booted', 'true');
                    onComplete();
                }, 800);
            }
        }, 400);

        return () => clearInterval(interval);
    }, [onComplete]);

    const handleSkip = () => {
        sessionStorage.setItem('skr_booted', 'true');
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

            {showSkip && (
                <button
                    onClick={handleSkip}
                    className="absolute bottom-10 right-10 text-[10px] opacity-50 hover:opacity-100 hover:text-white transition-opacity border border-[#00ff41]/30 px-3 py-1 uppercase tracking-widest"
                >
                    [ SKIP_BOOT ]
                </button>
            )}
        </main>
    );
};
