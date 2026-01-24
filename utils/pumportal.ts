
import fetch from 'node-fetch';
import { VersionedTransaction, Connection, Keypair, Transaction, SendOptions } from '@solana/web3.js';
import { WALLET_KEYPAIR, PUMP_PORTAL_API, RPC_URL, SLIPPAGE_BPS } from '../config';

const connection = new Connection(RPC_URL, "confirmed");

/**
 * PumpPortal API Wrapper
 * Uses "Local Transaction" endpoints so we always sign locally.
 */
export class PumpPortal {

    /**
     * Claim Creator Fees for the Token (ISG)
     */
    static async claimCreatorFees(mintParams: { mint: string }) {
        console.log(`[PumpPortal] Creating 'collectCreatorFee' TX for ${mintParams.mint}...`);

        try {
            const response = await fetch(`${PUMP_PORTAL_API}/trade-local`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicKey: WALLET_KEYPAIR.publicKey.toBase58(),
                    action: "collectCreatorFee",
                    mint: mintParams.mint,
                    priorityFee: 0.0001, // Adjustable
                    pool: "pump"
                })
            });

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`API Error: ${response.status} - ${txt}`);
            }

            const buffer = await response.arrayBuffer();
            const tx = VersionedTransaction.deserialize(new Uint8Array(buffer));

            // Sign locally
            tx.sign([WALLET_KEYPAIR]);

            // Send
            const sig = await connection.sendTransaction(tx);
            console.log(`[PumpPortal] Fee Claim Sent: https://solscan.io/tx/${sig}`);
            await connection.confirmTransaction(sig);
            console.log(`[PumpPortal] Fee Claim Confirmed!`);
            return sig;

        } catch (e) {
            console.error(`[PumpPortal] Failed to claim fees:`, e);
            throw e;
        }
    }

    /**
     * Buy Token (SKR) with SOL
     * @param amountSol Amount of SOL to spend
     * @param mint Token Mint to buy (SKR)
     */
    static async buyToken(amountSol: number, mint: string) {
        console.log(`[PumpPortal] Creating 'buy' TX for ${amountSol} SOL -> ${mint}...`);

        try {
            const response = await fetch(`${PUMP_PORTAL_API}/trade-local`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicKey: WALLET_KEYPAIR.publicKey.toBase58(),
                    action: "buy",
                    mint: mint,
                    denominatedInSol: "true",
                    amount: amountSol,
                    slippage: SLIPPAGE_BPS / 100, // API expects percent e.g. 10 for 10%
                    priorityFee: 0.0001,
                    pool: "pump"
                })
            });

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`API Error: ${response.status} - ${txt}`);
            }

            const buffer = await response.arrayBuffer();
            const tx = VersionedTransaction.deserialize(new Uint8Array(buffer));

            tx.sign([WALLET_KEYPAIR]);

            const sig = await connection.sendTransaction(tx);
            console.log(`[PumpPortal] Buy Sent: https://solscan.io/tx/${sig}`);
            await connection.confirmTransaction(sig);
            console.log(`[PumpPortal] Buy Confirmed!`);
            return sig;

        } catch (e) {
            console.error(`[PumpPortal] Buy failed:`, e);
            throw e;
        }
    }
}
