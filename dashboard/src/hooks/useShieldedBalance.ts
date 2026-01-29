import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createRpc } from '@lightprotocol/stateless.js';
import { SKR_MINT, RPC_URL } from '../config/constants';
// import { PublicKey } from '@solana/web3.js';

export const useShieldedBalance = () => {
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!publicKey) return;

        const fetchBalance = async () => {
            setLoading(true);
            try {
                // Initialize Light Protocol RPC
                // Use default public RPC if specific one not provided
                const rpc = createRpc(RPC_URL);

                // Fetch compressed token accounts
                const accounts = await rpc.getCompressedTokenAccountsByOwner(publicKey);

                // Filter for SKR Mint
                // Note: Structure might vary, but typically items contains info
                // Need to aggregate amount

                const skrMintStr = SKR_MINT;
                let total = 0;

                // accounts.items is the standard return structure for paginated calls in Light SDK
                const items = accounts.items || [];

                for (const acc of items) {
                    const { parsed } = acc as any; // ParsedTokenAccount

                    if (parsed && parsed.mint && parsed.mint.toBase58() === skrMintStr) {
                        const amount = Number(parsed.amount);
                        // Convert from raw units (9 decimals for SKR)
                        total += amount / 1_000_000_000;
                    }
                }

                setBalance(total);

            } catch (e) {
                console.warn("[Privacy] Failed to fetch shielded balance:", e);
                // setBalance(0); // Setup might be invalid, but we try-catch to avoid crash
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, [publicKey]);

    return { balance, loading };
};

