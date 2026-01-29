import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Unlock } from 'lucide-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
import { SKR_MINT, RPC_URL } from '../../config/constants';

export const UnshieldButton = ({ balance }: { balance: number }) => {
    const { publicKey, sendTransaction } = useWallet();
    const [loading, setLoading] = useState(false);

    const handleUnshield = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            // 1. Setup Connection
            const connection = new Connection(RPC_URL, "confirmed");

            // 2. Prepare Decompress Instruction (Unshield)
            const mint = new PublicKey(SKR_MINT);
            const amount = BigInt(Math.floor(balance * 1_000_000_000));

            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const destAta = await getAssociatedTokenAddress(mint, publicKey);

            console.log(`[Privacy] Decompressing ${amount.toString()}...`);

            // Using 'decompress' (Unshield) from SDK with Any cast
            const ix = await (CompressedTokenProgram as any).decompress({
                payer: publicKey,
                owner: publicKey,
                dest: destAta,
                mint: mint,
                amount: amount,
            });

            // 3. Send Transaction
            const tx = new Transaction().add(ix);
            const signature = await sendTransaction(tx, connection);

            console.log(`[Privacy] Unshield TX: ${signature}`);
            await connection.confirmTransaction(signature, "confirmed");

            alert(`SUCCESS: Assets Unshielded! TX: ${signature}`);

        } catch (e: any) {
            console.error("Unshield Error:", e);
            // Helpful fallback
            alert("Unshielding Error: " + (e.message || "Unknown. Ensure you have ZK proofs enabled via CLI."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleUnshield}
            disabled={balance <= 0}
            className={`flex items-center gap-2 px-4 py-3 border rounded text-xs uppercase tracking-widest transition-all min-h-[44px]
                ${balance > 0 ? "bg-[#00ff41]/10 border-[#00ff41]/20 hover:bg-[#00ff41]/20 text-[#00ff41]"
                    : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed"}
            `}
        >
            <Unlock className="w-3 h-3" />
            {loading ? "DECRYPTING..." : "UNSHIELD_ASSETS"}
        </button>
    );
};
