import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction } from '@solana/web3.js';
import { API_BASE_URL, RPC_URL } from '../config/constants';

interface ClaimState {
    points: number;
    amount: number;
    claimable: boolean;
    loading: boolean;
    txHash?: string;
    error?: string;
}

export const useClaim = (addLog: (msg: string) => void) => {
    const { publicKey, sendTransaction } = useWallet();
    const [state, setState] = useState<ClaimState>({
        points: 0,
        amount: 0,
        claimable: false,
        loading: false
    });

    const checkEligibility = async (address: string) => {
        setState(prev => ({ ...prev, loading: true }));
        addLog(`Analyzing wallet: ${address}...`);

        try {
            const res = await fetch(`${API_BASE_URL}/api/balance/${address}`);
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
            const res = await fetch(`${API_BASE_URL}/api/claim`, {
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

            const connection = new Connection(RPC_URL);
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

    return { state, checkEligibility, handleClaim };
};
