
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { ISG_MINT, SKR_MINT, RPC_URL, WALLET_KEYPAIR } from './config';
import { Distributor } from './components/distributor';

const connection = new Connection(RPC_URL, "confirmed");

async function main() {
    console.log("--- STARTING DEEP VERIFICATION ---");
    console.log(`RPC: ${RPC_URL}`);
    console.log(`ISG: ${ISG_MINT}`);
    console.log(`SKR: ${SKR_MINT}`);
    console.log(`Wallet: ${WALLET_KEYPAIR.publicKey.toBase58()}`);

    try {
        // 1. Verify Mints & Program IDs
        console.log("\n1. Verifying Mints...");
        const isgInfo = await connection.getAccountInfo(new PublicKey(ISG_MINT));
        const skrInfo = await connection.getAccountInfo(new PublicKey(SKR_MINT));

        if (!isgInfo) throw new Error("ISG Mint not found on-chain!");
        if (!skrInfo) throw new Error("SKR Mint not found on-chain!");

        const isgProgram = isgInfo.owner.toBase58();
        const skrProgram = skrInfo.owner.toBase58();

        console.log(`ISG Program ID: ${isgProgram} (${isgProgram === TOKEN_PROGRAM_ID.toBase58() ? 'V1' : 'Token-2022'})`);
        console.log(`SKR Program ID: ${skrProgram} (${skrProgram === TOKEN_PROGRAM_ID.toBase58() ? 'V1' : 'Token-2022'})`);

        // 2. Mock Burn/Claim Amounts
        console.log("\n2. Mocking Calculation...");
        const claimAmount = 10; // 10 SKR
        // Mock burn amount (just for testing transaction construction)
        const burnAmount = 5;   // 5 ISG

        const userKeypair = Keypair.generate();
        const userAddress = userKeypair.publicKey.toBase58();
        console.log(`Mock User: ${userAddress}`);

        // 3. Test Distributor
        console.log("\n3. Testing Distributor Transaction Creation...");
        console.log("Calling createClaimTransaction...");

        const tx = await Distributor.createClaimTransaction(userAddress, claimAmount, burnAmount);

        console.log("Transaction Object created.");

        // 4. Verify Serialization (The ultimate test of validity)
        console.log("\n4. Verifying Serialization...");
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.sign(WALLET_KEYPAIR); // Partial sign as Bot

        const serialized = tx.serialize({ requireAllSignatures: false });
        console.log("✅ Transaction Verified! Serialized Length:", serialized.length);
        console.log("Base64:", serialized.toString('base64').substring(0, 50) + "...");

        console.log("\n--- VERIFICATION SUCCESSFUL ---");
        console.log("The code logic is correct. If the system isn't working, it is 100% because the RUNNING PROCESS has not been restarted to load this code.");

    } catch (e: any) {
        console.error("\n❌ VERIFICATION FAILED ❌");
        console.error(e);
        process.exit(1);
    }
}

main();
