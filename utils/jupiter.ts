
import fetch from 'node-fetch'; // Ensure project uses 'node-fetch' or native fetch if Node 18+
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { WALLET_KEYPAIR, RPC_URL, SLIPPAGE_BPS } from '../config';

const connection = new Connection(RPC_URL, "confirmed");
const JUP_API = "https://quote-api.jup.ag/v6";

export class Jupiter {

    /**
     * Swap SOL for Token (SKR)
     * @param amountSol Amount of SOL to swap (in raw Lamports? No, let's use UI amount for input, convert internally if needed)
     *                  ACTUALLY, Jupiter expects inputAmount in Atoms (Lamports).
     * @param outputMint Target Token Mint
     */
    static async swapSolToToken(amountSol: number, outputMint: string) {
        // Convert SOL to Lamports (1 SOL = 1e9 Lamports)
        const inputAmountLamports = Math.floor(amountSol * 1_000_000_000);
        const inputMint = "So11111111111111111111111111111111111111112"; // Wrapped SOL

        console.log(`[Jupiter] Getting Quote for ${amountSol} SOL -> ${outputMint}...`);

        try {
            // 1. Get Quote
            const quoteUrl = `${JUP_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmountLamports}&slippageBps=${SLIPPAGE_BPS}`;
            const quoteResponse = await fetch(quoteUrl);
            const quoteData = await quoteResponse.json();

            if (!quoteData || quoteData.error) {
                throw new Error(`Jupiter Quote Error: ${JSON.stringify(quoteData)}`);
            }

            console.log(`[Jupiter] Quote received. Est. Output: ${quoteData.outAmount} units.`);

            // 2. Get Swap Transaction
            const swapResponse = await fetch(`${JUP_API}/swap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quoteResponse: quoteData,
                    userPublicKey: WALLET_KEYPAIR.publicKey.toBase58(),
                    wrapAndUnwrapSol: true,
                    // prioritize fees?
                    // dynamicComputeUnitLimit: true, // Optional
                })
            });

            const swapData = await swapResponse.json();

            if (!swapData || !swapData.swapTransaction) {
                throw new Error(`Jupiter Swap Error: ${JSON.stringify(swapData)}`);
            }

            // 3. Deserialize and Sign
            const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
            var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            transaction.sign([WALLET_KEYPAIR]);

            // 4. Send
            const rawTransaction = transaction.serialize();
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 2
            });

            console.log(`[Jupiter] Swap Sent: https://solscan.io/tx/${txid}`);

            const confirmation = await connection.confirmTransaction(txid);
            if (confirmation.value.err) {
                throw new Error(`Swap Failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log(`[Jupiter] Swap Confirmed!`);
            return txid;

        } catch (e) {
            console.error("[Jupiter] Swap failed:", e);
            throw e;
        }
    }
}
