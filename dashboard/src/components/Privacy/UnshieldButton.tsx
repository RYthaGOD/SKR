import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Unlock } from 'lucide-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
import { SKR_MINT, RPC_URL } from '../../config/constants';
import BN from 'bn.js';

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

            console.log(`[Privacy] Decompressing ${amount.toString()}...`);

            // Dynamic Import for protocol logic
            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const { createRpc } = await import('@lightprotocol/stateless.js');
            const {
                getTokenPoolInfos,
                selectMinCompressedTokenAccountsForDecompression,
            } = await import('@lightprotocol/compressed-token');

            const destAta = await getAssociatedTokenAddress(mint, publicKey);
            const rpc = createRpc(RPC_URL);

            // 1. Fetch compressed token accounts
            const { items: compressedAccounts } = await rpc.getCompressedTokenAccountsByOwner(publicKey, { mint });

            if (compressedAccounts.length === 0) {
                throw new Error("No shielded assets found to unshield.");
            }

            const BN = (await import('bn.js')).default;
            const { selectedAccounts, total } = selectMinCompressedTokenAccountsForDecompression(
                compressedAccounts,
                new BN(amount.toString())
            );

            if (total.lt(new BN(amount.toString()))) {
                throw new Error("Insufficient shielded balance for this operation.");
            }

            // 3. Fetch Validity Proof
            const proof = await rpc.getValidityProof(
                selectedAccounts.map(a => a.compressedAccount.hash)
            );

            // Using 'decompress' (Unshield) from SDK
            const ix = await (CompressedTokenProgram as any).decompress({
                payer: publicKey,
                inputCompressedTokenAccounts: selectedAccounts,
                toAddress: destAta,
                amount: amount,
                recentValidityProof: proof.compressedProof,
                recentInputStateRootIndices: proof.rootIndices,
                tokenPoolInfos: await getTokenPoolInfos(rpc, mint)
            });

            // 3. Add Compute Budget instructions (ZK operations are heavy)
            const { ComputeBudgetProgram, TransactionMessage, VersionedTransaction } = await import('@solana/web3.js');
            const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: 800_000,
            });
            const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 10_000,
            });

            // 4. Fetch Address Lookup Tables (Critical for ZK Decompression)
            const LOOKUP_TABLE_1 = new PublicKey("7i86eQs3GSqHjN47WdWLTCGMW6gde1q96G2EVnUyK2st");
            const LOOKUP_TABLE_2 = new PublicKey("H9QD4u1fG7KmkAzn2tDXhheushxFe1EcrjGGyEFXeMqT");

            const [lut1, lut2] = await Promise.all([
                connection.getAddressLookupTable(LOOKUP_TABLE_1),
                connection.getAddressLookupTable(LOOKUP_TABLE_2)
            ]);

            const lookupTableAccounts = [];
            if (lut1.value) lookupTableAccounts.push(lut1.value);
            if (lut2.value) lookupTableAccounts.push(lut2.value);

            // 5. Construct V0 Message
            const latestBlockhash = await connection.getLatestBlockhash();
            const messageV0 = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: [computeLimitIx, priorityFeeIx, ix]
            }).compileToV0Message(lookupTableAccounts);

            const tx = new VersionedTransaction(messageV0);

            // PRE-FLIGHT SIMULATION
            console.log("[Privacy] Simulating unshield V0 transaction...");
            const simulation = await connection.simulateTransaction(tx);
            if (simulation.value.err) {
                console.error("[Privacy] Unshield Simulation Failed. Logs:", simulation.value.logs);
                throw new Error(`Simulation Error: ${JSON.stringify(simulation.value.err)}. Check console for logs.`);
            }

            const signature = await sendTransaction(tx, connection);

            console.log(`[Privacy] Unshield TX: ${signature}`);
            await connection.confirmTransaction(signature, "confirmed");

            alert(`SUCCESS: Assets Unshielded! TX: ${signature}`);

        } catch (e: any) {
            console.error("Unshield Error:", e);
            alert("Unshielding Error: " + (e.message || "Unknown Error. Check console."));
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
