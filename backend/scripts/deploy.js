const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const safeClub = await hre.ethers.deployContract("SafeClub");
    await safeClub.waitForDeployment();

    console.log("SafeClub deployed to:", await safeClub.getAddress());

    // Optional: write address to frontend config
    const fs = require("fs");
    const path = require("path");
    const addressPath = path.join(__dirname, "../../frontend/utils/contract-address.json");
    fs.writeFileSync(addressPath, JSON.stringify({ SafeClub: await safeClub.getAddress() }, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
