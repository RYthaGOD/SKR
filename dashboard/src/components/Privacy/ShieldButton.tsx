import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield } from 'lucide-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
import { SKR_MINT, RPC_URL, SKR_DECIMALS } from '../../config/constants';

export const ShieldButton = ({ balance, onSuccess }: { balance: number, onSuccess?: () => void }) => {
    const { publicKey, sendTransaction } = useWallet();
    const [loading, setLoading] = useState(false);

    const handleShield = async () => {
        if (!publicKey || balance <= 0) return;
        setLoading(true);

        try {
            // 1. Setup Connection
            const connection = new Connection(RPC_URL, "confirmed");

            // 2. Prepare Compress Instruction (Shield)
            const mint = new PublicKey(SKR_MINT);
            // Amount in base units
            const decimalFactor = Math.pow(10, SKR_DECIMALS);
            const amount = BigInt(Math.floor(balance * decimalFactor));

            console.log(`[Privacy] Compressing ${amount.toString()} of ${mint.toBase58()}...`);

            const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
            const { createRpc, selectStateTreeInfo } = await import('@lightprotocol/stateless.js');
            const { getTokenPoolInfos, selectTokenPoolInfo } = await import('@lightprotocol/compressed-token');

            const sourceAta = await getAssociatedTokenAddress(mint, publicKey);

            // DIAGNOSTIC: Check actual ATA balance before anything
            try {
                const ataAccount = await getAccount(connection, sourceAta);
                console.log(`[Privacy] Source ATA: ${sourceAta.toBase58()}, Balance: ${ataAccount.amount.toString()}`);
                if (ataAccount.amount < amount) {
                    throw new Error(`Insufficient uncompressed SKR balance. Available: ${Number(ataAccount.amount) / 1e9}, Requested: ${Number(amount) / 1e9}`);
                }
            } catch (ataError: any) {
                console.error("[Privacy] ATA Check Failed:", ataError);
                if (ataError.name === "TokenAccountNotFoundError") {
                    throw new Error("Source SKR token account not found. Ensure you have uncompressed SKR in your wallet.");
                }
                throw ataError;
            }

            const rpc = createRpc(RPC_URL);

            // Fetch required metadata for compression
            const poolInfos = await getTokenPoolInfos(rpc, mint);
            const poolInfo = selectTokenPoolInfo(poolInfos);
            const treeInfos = await rpc.getStateTreeInfos();
            const treeInfo = selectStateTreeInfo(treeInfos);

            // Using 'compress' (Shield) from SDK
            const ix = await (CompressedTokenProgram as any).compress({
                payer: publicKey,
                owner: publicKey,
                source: sourceAta,
                toAddress: publicKey, // Shield to self
                mint: mint,
                amount: amount,
                tokenPoolInfo: poolInfo,
                outputStateTreeInfo: treeInfo
            });

            // 3. Add Compute Budget instructions (ZK operations are heavy)
            const { ComputeBudgetProgram, TransactionMessage, VersionedTransaction } = await import('@solana/web3.js');
            const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: 800_000,
            });
            const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 10_000,
            });

            // 4. Fetch Address Lookup Table (Essential for ZK Compression on Mainnet)
            const LOOKUP_TABLE_ADDRESS = new PublicKey("7i86eQs3GSqHjN47WdWLTCGMW6gde1q96G2EVnUyK2st");
            const lookupTableAccount = (await connection.getAddressLookupTable(LOOKUP_TABLE_ADDRESS)).value;

            if (!lookupTableAccount) {
                console.warn("[Privacy] LUT not found, falling back to legacy (might fail size check)");
            }

            // 5. Construct V0 Message
            const latestBlockhash = await connection.getLatestBlockhash();
            const messageV0 = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: [computeLimitIx, priorityFeeIx, ix]
            }).compileToV0Message(lookupTableAccount ? [lookupTableAccount] : []);

            const tx = new VersionedTransaction(messageV0);

            // PRE-FLIGHT SIMULATION for better error debugging
            console.log("[Privacy] Simulating V0 transaction...");
            const simulation = await connection.simulateTransaction(tx);
            if (simulation.value.err) {
                console.error("[Privacy] Simulation Failed. Logs:", simulation.value.logs);
                throw new Error(`Simulation Error: ${JSON.stringify(simulation.value.err)}. Check console for logs.`);
            }

            const signature = await sendTransaction(tx, connection);

            console.log(`[Privacy] Shield TX: ${signature}`);
            await connection.confirmTransaction(signature, "confirmed");

            alert(`SUCCESS: Assets Shielded/Compressed on Mainnet! TX: ${signature}`);
            if (onSuccess) onSuccess();

        } catch (e: any) {
            console.error("Shield Error:", e);
            alert("Shielding Failed: " + (e.message || "Unknown Error. Check console."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleShield}
            disabled={loading || balance <= 0}
            className={`flex items-center gap-2 px-4 py-3 border rounded text-xs uppercase tracking-widest transition-all min-h-[44px]
                ${balance > 0 ? "bg-[#00ff41]/10 border-[#00ff41]/20 hover:bg-[#00ff41]/20 text-[#00ff41]"
                    : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed"}
            `}
        >
            <Shield className="w-3 h-3" />
            {loading ? "ENCRYPTING..." : "SHIELD_ASSETS"}
        </button>
    );
};
