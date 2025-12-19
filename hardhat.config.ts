import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
    plugins: [hardhatToolboxMochaEthersPlugin],
    solidity: {
        profiles: {
            default: {
                version: "0.8.20",
                settings: {
                    // Use an older EVM version so Ganache (which often lags behind)
                    // understands the opcodes and doesn't throw "invalid opcode"
                    evmVersion: "paris",
                },
            },
            production: {
                version: "0.8.20",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    // Match the same EVM version for production builds
                    evmVersion: "paris",
                },
            },
        },
    },
    networks: {
        // Configuration pour Ganache
        ganache: {
            type: "http",
            url: "http://127.0.0.1:7545", // RPC SERVER de Ganache
            // chainId/networkId de Ganache (par défaut 5777)
            chainId: 5777,
            // Première adresse Ganache (owner du contrat SimpleTreasuryClub)
            accounts: ["0x50f0f0bb99f93aead025bf3ee9e85954d0126c09e101a89b55ccc261903d30a9"],
        },
        hardhatMainnet: {
            type: "edr-simulated",
            chainType: "l1",
        },
        hardhatOp: {
            type: "edr-simulated",
            chainType: "op",
        }
    },
});