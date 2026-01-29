
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { RPC_URL } from '../config/constants';

export const useTokenBalance = (mintAddress: string) => {
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!publicKey || !mintAddress) {
            setBalance(0);
            return;
        }

        const fetchBalance = async () => {
            setLoading(true);
            try {
                const connection = new Connection(RPC_URL, "confirmed");
                const mint = new PublicKey(mintAddress);
                const ata = await getAssociatedTokenAddress(mint, publicKey);

                const info = await connection.getTokenAccountBalance(ata);
                setBalance(info.value.uiAmount || 0);
            } catch (e) {
                // ATA might not exist (balance 0)
                setBalance(0);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [publicKey, mintAddress]);

    return { balance, loading };
};
