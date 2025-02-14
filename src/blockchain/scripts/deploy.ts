import { viem } from "hardhat";
import { getContract } from "viem";

async function main() {
  console.log("Deploying PatientNFT contract...");
  
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const PatientNFT = await viem.deployContract("PatientNFT");
  console.log("PatientNFT deployed to:", PatientNFT.address);

  // Verify deployment
  const name = await PatientNFT.read.name();
  const symbol = await PatientNFT.read.symbol();
  console.log(`Contract name: ${name}`);
  console.log(`Contract symbol: ${symbol}`);

  // Verify roles
  const MINTER_ROLE = await PatientNFT.read.MINTER_ROLE();
  const UPDATER_ROLE = await PatientNFT.read.UPDATER_ROLE();
  const DEFAULT_ADMIN_ROLE = await PatientNFT.read.DEFAULT_ADMIN_ROLE();

  const deployerAddress = deployer.account.address;
  console.log("\nRole assignments:");
  console.log(`Deployer address: ${deployerAddress}`);
  console.log(`Has admin role: ${await PatientNFT.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddress])}`);
  console.log(`Has minter role: ${await PatientNFT.read.hasRole([MINTER_ROLE, deployerAddress])}`);
  console.log(`Has updater role: ${await PatientNFT.read.hasRole([UPDATER_ROLE, deployerAddress])}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
