#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}Checking Deployment Prerequisites for Solana dApp Store (Linux)...${NC}"

# 1. Check Node.js
echo -e "\n${YELLOW}Checking Node.js...${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    # Extract major version
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✅ Node.js found: $NODE_VERSION (Compatible)${NC}"
    else
        echo -e "${RED}❌ Node.js found ($NODE_VERSION) but v18+ is required.${NC}"
    fi
else
    echo -e "${RED}❌ Node.js NOT found. Please install Node.js v18+.${NC}"
fi

# 2. Check Java (JDK 17)
echo -e "\n${YELLOW}Checking Java (JDK 17)...${NC}"
if command -v java >/dev/null 2>&1; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "   Detected: $JAVA_VERSION"
    if [[ "$JAVA_VERSION" == *"17."* ]]; then
        echo -e "${GREEN}✅ Java JDK 17 found.${NC}"
    else
        echo -e "${YELLOW}⚠️  Java found, but ensure it is JDK 17. Use 'update-alternatives' if needed.${NC}"
    fi
else
    echo -e "${RED}❌ Java NOT found. Please install OpenJDK 17.${NC}"
fi

# 3. Check Android SDK
echo -e "\n${YELLOW}Checking Android SDK...${NC}"
if [ -n "$ANDROID_HOME" ] || [ -n "$ANDROID_SDK_ROOT" ]; then
    echo -e "${GREEN}✅ ANDROID_HOME is set: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}${NC}"
    
    # Check for platform-tools (adb)
    if [ -f "${ANDROID_HOME:-$ANDROID_SDK_ROOT}/platform-tools/adb" ]; then
         echo -e "${GREEN}   ✅ platform-tools found.${NC}"
    else
         echo -e "${YELLOW}   ⚠️  platform-tools not found in SDK root.${NC}"
    fi
else
    echo -e "${RED}❌ ANDROID_HOME environment variable not set.${NC}"
    echo "   If you have Android Studio, set it (e.g., export ANDROID_HOME=\$HOME/Android/Sdk)."
    echo "   Bubblewrap might ask to install this for you."
fi

# 4. Check Bubblewrap
echo -e "\n${YELLOW}Checking Bubblewrap CLI...${NC}"
if command -v bubblewrap >/dev/null 2>&1; then
    BW_VERSION=$(bubblewrap --version)
    echo -e "${GREEN}✅ Bubblewrap CLI found: $BW_VERSION${NC}"
else
    echo -e "${RED}❌ Bubblewrap CLI not found.${NC}"
    echo "   Install with: npm install -g @bubblewrap/cli"
fi

# 5. Check Solana Mobile dApp Store CLI
echo -e "\n${YELLOW}Checking Solana dApp Store CLI...${NC}"
if command -v dapp-store >/dev/null 2>&1; then
    DS_VERSION=$(dapp-store --version)
    echo -e "${GREEN}✅ dApp Store CLI found: $DS_VERSION${NC}"
else
    echo -e "${RED}❌ dApp Store CLI not found.${NC}"
    echo "   Install with: npm install -g @solana-mobile/dapp-store-cli"
fi

# 6. Check Solana CLI
echo -e "\n${YELLOW}Checking Solana CLI...${NC}"
if command -v solana >/dev/null 2>&1; then
    SOL_VERSION=$(solana --version)
    echo -e "${GREEN}✅ Solana CLI found: $SOL_VERSION${NC}"
else
    echo -e "${RED}❌ Solana CLI not found. You will need this for the wallet.${NC}"
fi

echo -e "\n${CYAN}Check complete.${NC}"
