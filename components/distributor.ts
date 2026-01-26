
import {
    Connection,
    PublicKey,
    Transaction,
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountIdempotentInstruction,
    createBurnInstruction,
    getMint,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import { RPC_URL, WALLET_KEYPAIR, SKR_MINT, ISG_MINT } from '../config';

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Production Distributor
 * Handles secure Claim Transactions.
 */
export class Distributor {

    /**
     * Create Claim Transaction
     * - Burns ISG from User
     * - Transfers SKR from Vault (Bot) to User
     * - Partially signed by Bot (SKR Source)
     */
    static async createClaimTransaction(userAddress: string, skrAmount: number, isgBurnAmount: number): Promise<Transaction> {
        const skrMint = new PublicKey(SKR_MINT);
        const isgMint = new PublicKey(ISG_MINT);
        const userPubkey = new PublicKey(userAddress);
        const vaultPubkey = WALLET_KEYPAIR.publicKey;

        const tx = new Transaction();

        // 1. Burn ISG (User Instruction)
        const userISG = await getAssociatedTokenAddress(isgMint, userPubkey, false, TOKEN_2022_PROGRAM_ID);
        const isgMintInfo = await getMint(connection, isgMint, "confirmed", TOKEN_2022_PROGRAM_ID);
        const isgRaw = Math.floor(isgBurnAmount * Math.pow(10, isgMintInfo.decimals));

        tx.add(
            createBurnInstruction(
                userISG,      // Account to burn from
                isgMint,      // Mint
                userPubkey,   // Owner
                isgRaw,       // Amount
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );

        // 2. Transfer SKR (Vault Instruction)
        const vaultSKR = await getAssociatedTokenAddress(skrMint, vaultPubkey);
        const userSKR = await getAssociatedTokenAddress(skrMint, userPubkey);

        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                userPubkey,   // Payer (User)
                userSKR,      // ATA
                userPubkey,   // Owner
                skrMint       // Mint
            )
        );

        const skrMintInfo = await getMint(connection, skrMint);
        const skrRaw = Math.floor(skrAmount * Math.pow(10, skrMintInfo.decimals));

        tx.add(
            createTransferInstruction(
                vaultSKR,
                userSKR,
                vaultPubkey,
                skrRaw
            )
        );

        tx.feePayer = userPubkey;
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        tx.recentBlockhash = blockhash;

        // Partial Sign
        tx.partialSign(WALLET_KEYPAIR);

        return tx;
    }
}
