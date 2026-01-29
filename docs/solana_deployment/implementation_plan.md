# Master Deployment Plan: Solana dApp Store 2.0 (Linux Edition)

## Objective
Deploy the SKR Dashboard to the Solana dApp Store 2.0 with zero errors and a 100% first-try success rate.

## Current Status (2026-01-27)
- **Node.js**: ✅ Ready (v20)
- **Solana CLI**: ✅ Ready
- **JDK 17**: ❌ MISSING
- **Android SDK**: ❌ MISSING
- **Bubblewrap**: ❌ MISSING
- **dApp Store CLI**: ❌ MISSING

---

## Phase 1: The "Ironclad" Foundation
We cannot build without these tools. You must run these commands.

### 1. Install Java (JDK 17)
Bubblewrap *requires* Java 17.
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk -y

# Verify
java -version
# Output MUST contain "openjdk 17" or "17.0.x"
```

### 2. Install NPM Tools
I can auto-run this, but for completeness:
```bash
npm install -g @bubblewrap/cli @solana-mobile/dapp-store-cli
```

### 3. Initialize Bubblewrap (Auto-Install SDK)
Bubblewrap is smart. It can download the Android SDK for you if Java is present.
```bash
# Create a robust directory
mkdir -p ~/deployment/bubblewrap
cd ~/deployment/bubblewrap

# This command will ask to install Android SDK. 
# SAY YES to everything.
bubblewrap doctor
```
*Note: If `bubblewrap doctor` fails to install the SDK, we will need to manually download the Android Command Line Tools.*

---

## Phase 2: Assets that Don't Get Rejected
The #1 reason for rejection is bad assets. We will follow the **Strict Policy**.

### Directory Structure
Create `~/deployment/assets`.

### 1. App Icon (`icon.png`)
*   **Size**: EXACTLY 512x512 pixels.
*   **Format**: PNG (No transparency is safer, but transparency allowed).
*   **Content**: Your logo. Keep important details in the inner 75% "safe zone".
*   **Action**: Use `identify deployment/assets/icon.png` to verify size.

### 2. Feature Graphic / Banner (`banner.png`)
*   **Size**: EXACTLY 1024x500 pixels (Google Play standard) or 1200x600 pixels (Solana often accepts this, but 1024x500 is safer for Android manifests). **Recommendation: 1024x500**.
*   **Format**: PNG or JPG.
*   **Content**: Marketing visual. Text should be large and centered.

### 3. Screenshots
*   **Quantity**: Minimum 4, Maximum 8.
*   **Dimensions**:
    *   **Portrait**: 1080x1920
    *   **Landscape**: 1920x1080
*   **Content**: Actual app usage. No blurry text.
*   **Filenames**: `screen1.png`, `screen2.png`, etc.

---

## Phase 3: The Build (Bubblewrap)
We convert your web dashboard into an Android APK (TWA - Trusted Web Activity).

1.  **Initialize Project**:
    ```bash
    cd ~/deployment/bubblewrap
    bubblewrap init --manifest https://your-dashboard-url.com/manifest.json
    ```
    *   *If you don't have a live manifest, answering the prompts will generate one.*
    *   **Signing Key**: Choose **"Create new keystore"**.
    *   **Key Store Password**: WRITE THIS DOWN.
    *   **Key Password**: WRITE THIS DOWN.

2.  **Build**:
    ```bash
    bubblewrap build
    ```
    *   **Result**: `app-release-signed.apk`.

---

## Phase 4: The Publication (Solana Mobile)
This involves on-chain actions.

1.  **Initialize dApp Store Config**:
    ```bash
    mkdir -p ~/deployment/dapp-store
    cd ~/deployment/dapp-store
    dapp-store init
    ```
    This creates `config.yaml`.

2.  **Edit `config.yaml` (CRITICAL)**:
    We must fill this accurately.
    *   `publisher`: Your details.
    *   `app`: App details.
    *   `release`: Point to your `assets` and the `apk`.
    *   **Crucial Flags**: Ensure the config reflects that you are authorized.

3.  **Validate**:
    ```bash
    dapp-store validate
    ```
    *   Must return "Validation successful". **Zero warnings**.

4.  **Mint & Publish**:
    *   **Create Publisher**:
        ```bash
        dapp-store create-publisher --keypair /path/to/solana-wallet.json
        ```
    *   **Create App**:
        ```bash
        dapp-store create-app --publisher-address <PUB_ADDR_FROM_ABOVE>
        ```
    *   **Create Release**:
        ```bash
        dapp-store create-release --app-address <APP_ADDR> --build-tools-path <PATH_TO_ANDROID_SDK>
        # Note: build-tools-path might be auto-detected or needed if validation fails.
    ```

5.  **Submit**:
    This sends the request to the Solana Mobile team.
    ```bash
    dapp-store publish submit --app-address <APP_ADDR> --release-address <RELEASE_ADDR> --complies-with-solana-dapp-store-policies --requestor-is-authorized
    ```

---

## Phase 5: Verification (The "No Mistakes" Check)
Before submitting, we run this checklist:
- [ ] `check_prereqs.sh` passes 100%.
- [ ] `bubblewrap build` produced a signed APK.
- [ ] all images are verified with `file` or `identify` to be exact dimensions.
- [ ] `dapp-store validate` returns success.
- [ ] You have ~0.5 SOL in yourCLI wallet for minting costs.
