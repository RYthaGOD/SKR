# Step-by-Step Deployment Plan: Solana dApp Store 2.0

## Goal
Deploy the SKR Dashboard to the Solana dApp Store with zero hassle.

## Phase 1: Environment Readiness (The Foundation)
We need to ensure your Windows machine can build Android apps.
- [ ] **Run Check Script**: Run the `check_prereqs.ps1` script I created to verify your system.
    -   *If missing Node.js*: Install from nodejs.org.
    -   *If missing JDK 17*: Install from Adoptium.net.
- [ ] **Install Tools**:
    ```powershell
    npm install -g @bubblewrap/cli
    npm install -g @solana-mobile/dapp-publishing-cli
    ```

## Phase 2: Asset Generation (The Rejection Shield)
We must create these exact assets to avoid auto-rejection.
- [ ] **Create Folder structure**:
    ```text
    /deployment
      /assets
      config.yaml
    ```
- [ ] **Generate/Collect Images**:
    - [ ] **Icon (512x512 PNG)**: Must be square. Keep important logos in the center (safe zone).
    - [ ] **Banner (1200x600 PNG/JPG)**: Marketing graphic.
    - [ ] **Screenshots (4x)**: Take 4 screenshots of the dashboard. Resize them to **1080x1920** (Portrait) OR **1920x1080** (Landscape). consistency is key.

## Phase 3: Building the APK (The Wrapper)
We turn your website into an app.
- [ ] **Initialize Bubblewrap**:
    -   Run `bubblewrap init --manifest https://dashboard-production-5825.up.railway.app/manifest.json` (If you don't have a manifest, we will create one).
    -   *Crucial Answer*: When asked about "Signing Key", choose **"Create a new keystore"**.
    -   **SAVE THE PASSWORDS**.
- [ ] **Build**:
    -   Run `bubblewrap build`.
    -   Result: `app-release-signed.apk`. Move this to your `/deployment` folder.

## Phase 4: Submission (The Launch)
- [ ] **Configure**:
    -   Copy the `config_template.yaml` I provided to `config.yaml`.
    -   Fill in your specific details (URLs, etc.).
- [ ] **Validate**:
    -   Run `dapp-store validate`.
    -   Fix any reported errors (usually image sizes).
- [ ] **Publish**:
    -   Run `dapp-store publish`.
    -   You will need a Solana CLI wallet with ~0.05 SOL.

## Risk Assessment & Mitigation (Getting to 100% Certainty)
To ensure success, we must address these specific risks:

| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Environment Issues** | Medium | Blocker | **Run `check_prereqs.ps1` FIRST.** If this passes, the build *will* work. |
| **Store Rejection** | Low | Delay | Follow our **Strict Asset Specs** (512px icon, etc.). Don't guess. |
| **Key Loss** | Low | Critical | We will save the **Keystore file** and **Password** in a dedicated password manager immediately. |
| **Review Fail** | Low | Rejection | Ensure the dashboard URL in `config.yaml` is live and working before submitting. |

## Immediate Go/No-Go Check
We cannot proceed with 100% certainty until we run the verification script.
- [ ] **Run `check_prereqs.ps1`**
    -   ✅ **PASS**: We are 100% ready to build.
    -   ❌ **FAIL**: We must fix the specific missing tool (Java/Node) before doing anything else.
