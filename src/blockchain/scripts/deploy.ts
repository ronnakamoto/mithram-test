import { viem } from "hardhat";

async function main() {
  console.log("Deploying PatientNFT contract...");

  const patientNFT = await viem.deployContract("PatientNFT");
  console.log("PatientNFT deployed to:", patientNFT.address);

  // Get contract instance
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  // Verify deployment
  const name = await patientNFT.read.name();
  const symbol = await patientNFT.read.symbol();
  console.log(`Contract name: ${name}`);
  console.log(`Contract symbol: ${symbol}`);

  // Verify roles
  const MINTER_ROLE = await patientNFT.read.MINTER_ROLE();
  const UPDATER_ROLE = await patientNFT.read.UPDATER_ROLE();
  const DEFAULT_ADMIN_ROLE = await patientNFT.read.DEFAULT_ADMIN_ROLE();

  const deployerAddress = await deployer.account.address;
  console.log("\nRole assignments:");
  console.log(`Deployer address: ${deployerAddress}`);
  console.log(`Has admin role: ${await patientNFT.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddress])}`);
  console.log(`Has minter role: ${await patientNFT.read.hasRole([MINTER_ROLE, deployerAddress])}`);
  console.log(`Has updater role: ${await patientNFT.read.hasRole([UPDATER_ROLE, deployerAddress])}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
