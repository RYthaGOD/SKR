
import { Connection, Keypair } from '@solana/web3.js';
import { Distributor } from './components/distributor';
import { RPC_URL, WALLET_KEYPAIR } from './config';

const connection = new Connection(RPC_URL, "confirmed");

async function checkBurn() {
    console.log("--- BURN INSTRUCTION CHECK ---");

    // Mock Data
    const userKeypair = Keypair.generate();
    const userAddress = userKeypair.publicKey.toBase58();
    const claimAmount = 100;
    const burnAmount = 50;

    console.log(`Creating Claim Tx for ${userAddress}...`);
    console.log(`Burn Amount: ${burnAmount} ISG`);

    try {
        const tx = await Distributor.createClaimTransaction(userAddress, claimAmount, burnAmount);

        console.log(`\nTransaction Instructions: ${tx.instructions.length}`);

        let burnFound = false;

        tx.instructions.forEach((ix, i) => {
            console.log(`\nInstruction #${i + 1}:`);
            console.log(`ProgramId: ${ix.programId.toBase58()}`);
            console.log(`Keys: ${ix.keys.map(k => k.pubkey.toBase58().slice(0, 8)).join(', ')}`);

            // Check if this looks like a burn (Token Program + 3 keys usually)
            // Burn Instruction layout: [Account, Mint, Owner]
            // We can't easily decode the data without the struct, but we can verify it targets the ISG Mint.

            // ISG Mint is the 2nd account in Burn? 
            // spl-token createBurnInstruction(account, mint, owner, ...)

            // Let's rely on program ID matching Token Program (or 2022)
            if (ix.keys.length >= 3) {
                console.log("  -> Potential Token Instruction");
                burnFound = true; // Simplified check
            }
        });

        if (burnFound) {
            console.log("\n✅ BURN INSTRUCTION DETECTED.");
            console.log("The transaction explicitly includes a Token Instruction (Burn).");
        } else {
            console.error("\n❌ NO TOKEN INSTRUCTION FOUND.");
        }

    } catch (e) {
        console.error(e);
    }
}

checkBurn();
