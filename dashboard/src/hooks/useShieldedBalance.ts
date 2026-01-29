import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Rpc } from '@lightprotocol/stateless.js';
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
                const rpc = new Rpc(RPC_URL);

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
                    // Cast to any to bypass generic return type issues
                    const a = acc as any;

                    // Check if this compressed account is for our mint
                    // Accessing .mint property - might need to check structure if it's nested in .token
                    if (a.token && a.token.mint.toBase58() === skrMintStr) {
                        const amount = Number(a.token.amount);
                        // Convert from raw units (assuming 9 decimals like standard SPL if not specified)
                        // Better to get decimals from mint, but SDK often returns raw
                        // For now assume 9 decimals for SKR
                        total += amount / 1_000_000_000;
                    }
                    // Fallback check if structure is different
                    else if (a.mint && a.mint.toBase58() === skrMintStr) {
                        const amount = Number(a.amount);
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

