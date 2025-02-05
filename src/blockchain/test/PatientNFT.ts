import { expect } from "chai";
import { viem } from "hardhat";
import { Account, PublicClient, WalletClient, getAddress, keccak256, stringToBytes } from "viem";

describe("PatientNFT", function () {
  let patientNFT: any;
  let publicClient: PublicClient;
  let owner: WalletClient;
  let minter: WalletClient;
  let updater: WalletClient;
  let user: WalletClient;

  const MINTER_ROLE = keccak256(stringToBytes("MINTER_ROLE"));
  const UPDATER_ROLE = keccak256(stringToBytes("UPDATER_ROLE"));

  beforeEach(async function () {
    const clients = await viem.getWalletClients();
    [owner, minter, updater, user] = clients;
    publicClient = await viem.getPublicClient();

    patientNFT = await viem.deployContract("PatientNFT");

    // Grant roles
    await patientNFT.write.grantRole([MINTER_ROLE, await minter.account.address]);
    await patientNFT.write.grantRole([UPDATER_ROLE, await updater.account.address]);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const defaultAdminRole = await patientNFT.read.DEFAULT_ADMIN_ROLE();
      expect(await patientNFT.read.hasRole([defaultAdminRole, await owner.account.address])).to.be.true;
    });

    it("Should assign roles correctly", async function () {
      expect(await patientNFT.read.hasRole([MINTER_ROLE, await minter.account.address])).to.be.true;
      expect(await patientNFT.read.hasRole([UPDATER_ROLE, await updater.account.address])).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint NFTs", async function () {
      const patientId = "patient123";
      const analysisId = "analysis123";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const userAddress = await user.account.address;

      const tx = await patientNFT.write.safeMint(
        [userAddress, patientId, analysisId, uri, metadataHash],
        { account: await minter.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });

      // Verify token ownership and metadata
      const ownerAddress = await patientNFT.read.ownerOf([0n]);
      const tokenURI = await patientNFT.read.tokenURI([0n]);
      expect(ownerAddress.toLowerCase()).to.equal(userAddress.toLowerCase());
      expect(tokenURI).to.equal(uri);
    });

    it("Should prevent non-minters from minting", async function () {
      const patientId = "patient123";
      const analysisId = "analysis123";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const userAddress = await user.account.address;

      await expect(
        patientNFT.write.safeMint(
          [userAddress, patientId, analysisId, uri, metadataHash],
          { account: userAddress }
        )
      ).to.be.rejected;
    });

    it("Should prevent duplicate patient IDs", async function () {
      const patientId = "patient123";
      const analysisId1 = "analysis123";
      const analysisId2 = "analysis456";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const userAddress = await user.account.address;

      const tx = await patientNFT.write.safeMint(
        [userAddress, patientId, analysisId1, uri, metadataHash],
        { account: await minter.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      await expect(
        patientNFT.write.safeMint(
          [userAddress, patientId, analysisId2, uri, metadataHash],
          { account: await minter.account.address }
        )
      ).to.be.rejected;
    });
  });

  describe("Metadata Updates", function () {
    beforeEach(async function () {
      const patientId = "patient123";
      const analysisId = "analysis123";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const tx = await patientNFT.write.safeMint(
        [await user.account.address, patientId, analysisId, uri, metadataHash],
        { account: await minter.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });
    });

    it("Should allow updater to update metadata", async function () {
      const tokenId = 0n;
      const newUri = "ipfs://updated";
      const newHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
      const tx = await patientNFT.write.updateMetadata(
        [tokenId, newUri, newHash],
        { account: await updater.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });

      const updatedUri = await patientNFT.read.tokenURI([tokenId]);
      const updatedHash = await patientNFT.read.getMetadataHash([tokenId]);
      expect(updatedUri).to.equal(newUri);
      expect(updatedHash).to.equal(newHash);
    });

    it("Should prevent non-updaters from updating metadata", async function () {
      const tokenId = 0n;
      const newUri = "ipfs://updated";
      const newHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
      await expect(
        patientNFT.write.updateMetadata(
          [tokenId, newUri, newHash],
          { account: await user.account.address }
        )
      ).to.be.rejected;
    });
  });

  describe("Patient Token Queries", function () {
    beforeEach(async function () {
      const patientId = "patient123";
      const analysisId = "analysis123";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const tx = await patientNFT.write.safeMint(
        [await user.account.address, patientId, analysisId, uri, metadataHash],
        { account: await minter.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });
    });

    it("Should return correct token ID for patient", async function () {
      const patientId = "patient123";
      const tokenId = await patientNFT.read.getTokenByPatient([patientId]);
      expect(tokenId).to.equal(0n);
    });

    it("Should revert for non-existent patient", async function () {
      const nonExistentPatient = "nonexistent123";
      await expect(
        patientNFT.read.getTokenByPatient([nonExistentPatient])
      ).to.be.rejected;
    });
  });

  describe("Analysis Token Queries", function () {
    it("Should store and retrieve token by analysis ID", async function () {
      const patientId = "patient123";
      const analysisId = "analysis123";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

      const tx = await patientNFT.write.safeMint(
        [await owner.account.address, patientId, analysisId, uri, metadataHash],
        { account: await minter.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });

      const tokenId = await patientNFT.read.getTokenByAnalysis([analysisId]);
      expect(tokenId).to.equal(0n);
    });

    it("Should prevent duplicate analysis IDs", async function () {
      const patientId1 = "patient1";
      const patientId2 = "patient2";
      const analysisId = "analysis123";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

      const tx = await patientNFT.write.safeMint(
        [await owner.account.address, patientId1, analysisId, uri, metadataHash],
        { account: await minter.account.address }
      );
      await publicClient.waitForTransactionReceipt({ hash: tx });
      
      await expect(
        patientNFT.write.safeMint(
          [await owner.account.address, patientId2, analysisId, uri, metadataHash],
          { account: await minter.account.address }
        )
      ).to.be.rejected;
    });

    it("Should revert for empty analysis ID", async function () {
      const patientId = "patient123";
      const analysisId = "";
      const uri = "ipfs://test";
      const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

      await expect(
        patientNFT.write.safeMint(
          [await owner.account.address, patientId, analysisId, uri, metadataHash],
          { account: await minter.account.address }
        )
      ).to.be.rejected;
    });

    it("Should revert for non-existent analysis", async function () {
      const nonExistentAnalysis = "nonexistent123";
      await expect(
        patientNFT.read.getTokenByAnalysis([nonExistentAnalysis])
      ).to.be.rejected;
    });
  });
});
