const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy Governance Token
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("GovernanceToken deployed to:", tokenAddress);

    // 2. Deploy Governor
    const MyGovernor = await hre.ethers.getContractFactory("MyGovernor");
    const governor = await MyGovernor.deploy(tokenAddress);
    await governor.waitForDeployment();
    const governorAddress = await governor.getAddress();
    console.log("MyGovernor deployed to:", governorAddress);

    // 3. Delegation (Delegate to self for testing)
    await token.delegate(deployer.address);
    console.log("Delegated to self");

    // --- SAVE FRONTEND FILES ---
    const frontendDir = path.join(__dirname, "../frontend/public");
    if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
    }

    // Save Deployments
    const deployments = {
        GovernanceToken: tokenAddress,
        MyGovernor: governorAddress
    };
    fs.writeFileSync(
        path.join(frontendDir, "deployments.json"),
        JSON.stringify(deployments, null, 2)
    );

    // Save ABIs
    const abiDir = path.join(frontendDir, "abis");
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
    }

    const tokenArtifact = await hre.artifacts.readArtifact("GovernanceToken");
    const govArtifact = await hre.artifacts.readArtifact("MyGovernor");

    fs.writeFileSync(
        path.join(abiDir, "GovernanceToken.json"),
        JSON.stringify(tokenArtifact, null, 2)
    );
    fs.writeFileSync(
        path.join(abiDir, "MyGovernor.json"),
        JSON.stringify(govArtifact, null, 2)
    );

    console.log("Artifacts and Deployments saved to frontend/public/");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


