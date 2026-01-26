
# Infinite Seeker Glitch (ISG) Protocol Manual

Welcome to the **ISG Flywheel Protocol**. This document explains exactly how the system works in simple terms.

---

## 🔰 How It Works (For Dummies)

Think of this system as a **Perpetual Reward Machine**. Its goal is to reward people for holding **ISG** tokens by giving them **SKR** tokens, while simultaneously making ISG more scarce (and valuable) over time.

### The 4-Step Cycle

#### 1. The Fuel ⛽ (Fees)
Every time someone trades **ISG** on the market (Pump.fun), a small "Creator Fee" is generated. Usually, this just goes to the dev's wallet. 
**In our system, these fees belong to the Community.**

#### 2. The Buyback 🛒 (Auto-Buy)
A Robot (The Flywheel) watches these fees 24/7.
*   When the fees pile up to a certain amount (e.g., 0.05 SOL), the Robot claims them.
*   It immediately takes that SOL and **buys SKR tokens** from the market.
*   These SKR tokens are stored in a secure "Vault" waiting for you.

#### 3. The Snapshot 📸 (The Calculations)
The system runs in time loops called **Cycles** (or Epochs).
At the end of every Cycle:
*   The system looks at how much SKR is in the Vault.
*   It looks at how much ISG everyone is holding.
*   It calculates a **"Pay Rate"**: `Total SKR in Vault / Total ISG held by people`.
*   This Rate determines how much SKR every single ISG token is worth for that Cycle.

#### 4. The Claim & Burn 🔥 (The Magic)
This is where you come in.
*   You go to the Dashboard and connect your wallet.
*   The system sees you hold ISG.
*   It offers you your share of the SKR tokens based on the Pay Rate.
*   **The Twist**: To claim your rewards, the protocol asks for a small "Sacrifice". You must **Burn** (destroy) a tiny amount of your ISG (equivalent to ~20% of the reward value).
*   **Why Burn?**: Burning deletes ISG tokens from existence effectively forever. This reduces the total supply, making everyone else's tokens scarcer.

**Summary:** 
Market Fees -> Buy SKR -> You Claim SKR -> You Burn ISG -> ISG Supply Goes Down 📉 -> Value Goes Up 📈.

---

## 👷 For Developers: System Architecture

The codebase consists of a background worker ("The Flywheel") and a web API/Dashboard.

### Key Components

*   **Flywheel (`flywheel.ts`)**: The main engine.
    *   **Monitor**: Checks Pump.fun bonding curve for accrued fees.
    *   **Claimer**: Signs transactions to claim fees into the Creator Wallet.
    *   **Buyer**: Uses Jupiter Aggregator to swap SOL -> SKR.
    *   **Epoch Manager**: Snapshots balances and calculates the distribution rate.
*   **Database (`flywheel.db`)**: SQLite database storing:
    *   Historical Prices (ISG, SKR, SOL).
    *   Claim history (who claimed what and when).
    *   Logs and System State.
*   **API (`server`)**: Provides data to the frontend Dashboard.
    *   `/api/stats`: Returns global stats (Price, Vault Balance, Burn Total).
    *   `/api/claim`: Constructs the **Atomic Transaction** (Send SKR to User + Burn User's ISG) for the user to sign.

### 🛠 Setup & Installation

If you want to run this system yourself:

1.  **Prerequisites**:
    *   Node.js (v16+)
    *   A Solana Wallet Keypair (The Creator Wallet of the ISG token).

2.  **Configuration**:
    *   Clone the repo.
    *   Run `npm install`.
    *   Edit `config.ts`:
        ```typescript
        export const ISG_MINT = "YOUR_MINT_ADDRESS";
        export const SKR_MINT = "REWARD_TOKEN_ADDRESS"; 
        export const PRIVATE_KEY_STRING = "YOUR_PRIVATE_KEY"; // Use Environment Vars in Prod!
        ```

3.  **Run the Flywheel**:
    ```bash
    npx ts-node flywheel.ts
    ```
    This starts the loop (Check Fees -> Buyback -> Snapshot).

4.  **Run the Dashboard**:
    ```bash
    cd dashboard
    npm run dev
    ```

### ⚠️ Disclaimer
This protocol involves real money, automated trading, and token burning. Use at your own risk. Always audit the code before deploying real capital.
