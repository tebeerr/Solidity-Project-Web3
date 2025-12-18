import { ethers } from "ethers";
import fs from "fs";

// Same RPC and private key as configured for the Ganache network in hardhat.config.ts
const GANACHE_RPC_URL = "http://127.0.0.1:7545";
const GANACHE_PRIVATE_KEY =
    "0x2a30499bc4bd74764938361d0c83e0b525d49a5fa466eb8fe1acc61f74e850a5";

async function main() {
    // Set up a direct ethers.js connection to Ganache
    const provider = new ethers.JsonRpcProvider(GANACHE_RPC_URL);
    const wallet = new ethers.Wallet(GANACHE_PRIVATE_KEY, provider);

    // Check account balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`📊 Account Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`📝 Deploying from: ${wallet.address}`);
    
    if (balance === 0n) {
        console.error("❌ Error: Account has no ETH. Please fund the account in Ganache.");
        process.exit(1);
    }

    // Load the compiled artifact produced by Hardhat
    const artifactPath =
        "./artifacts/contracts/SimpleTreasuryClub.sol/SimpleTreasuryClub.json";
    const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    console.log("🚀 Deploying SimpleTreasuryClub contract...");

    // Deploy the SimpleTreasuryClub contract with the same owner as in hardhat.config.ts
    const factory = new ethers.ContractFactory(
        artifactJson.abi,
        artifactJson.bytecode,
        wallet
    );
    const treasuryClub = await factory.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await treasuryClub.waitForDeployment();

    const address = await treasuryClub.getAddress();

    // Auto-link to the frontend constants file
    const path = "./safe-club-frontend/src/contract/constants.js";
    const content = `
export const CONTRACT_ADDRESS = "${address}";
export const ABI = ${JSON.stringify(artifactJson.abi)};
`;

    fs.writeFileSync(path, content);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ SUCCESS! SimpleTreasuryClub deployed successfully!");
    console.log("=".repeat(60));
    console.log(`📍 Contract Address: ${address}`);
    console.log(`📄 ABI updated in: ${path}`);
    console.log("=".repeat(60) + "\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});