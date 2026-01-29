import { useState } from 'react';
import { SKR_MINT, RPC_URL } from '../../config/constants';
import { Terminal, Copy } from 'lucide-react';

interface CliHelperProps {
    type: 'shield' | 'unshield';
    amount: number;
    balance: number;
}

export const CliHelper = ({ type, amount, balance }: CliHelperProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // Commands based on Light Protocol CLI 
    const cmd = type === 'shield'
        ? `light shield --mint ${SKR_MINT} --amount ${amount} --url ${RPC_URL}`
        : `light unshield --mint ${SKR_MINT} --amount ${amount} --url ${RPC_URL}`;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="text-xs opacity-40 hover:opacity-100 flex items-center gap-1 mt-2 underline p-3 min-h-[44px]"
            >
                <Terminal className="w-3 h-3" />
                ADVANCED: GENERATE_CLI_COMMAND
            </button>
        );
    }

    return (
        <div className="mt-3 p-3 bg-black/40 border border-[#00ff41]/20 rounded text-xs font-mono">
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="opacity-50 uppercase tracking-widest text-[9px]">MANUAL_OVERRIDE_CLI</span>
                <button onClick={() => setIsOpen(false)} className="opacity-50 hover:text-white p-2 min-w-[30px] text-center">x</button>
            </div>

            <div className="flex gap-2">
                <code className="flex-1 bg-black/50 p-2 text-[#00ff41] break-all border border-[#00ff41]/10 rounded">
                    {cmd}
                </code>
                <button
                    onClick={() => navigator.clipboard.writeText(cmd)}
                    className="p-3 hover:bg-[#00ff41]/20 rounded transition-colors min-w-[44px] flex items-center justify-center"
                >
                    <Copy className="w-4 h-4" />
                </button>
            </div>
            <div className="mt-2 text-[9px] opacity-40">
                *Requires user-configured Light Protocol CLI environment.
            </div>
        </div>
    );
};
