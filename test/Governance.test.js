const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");


describe("Governance System", function () {
    let GovernanceToken, token;
    let MyGovernor, governor;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        GovernanceToken = await ethers.getContractFactory("GovernanceToken");
        token = await GovernanceToken.deploy();
        await token.waitForDeployment();

        MyGovernor = await ethers.getContractFactory("MyGovernor");
        const tokenAddress = await token.getAddress();
        governor = await MyGovernor.deploy(tokenAddress);
        await governor.waitForDeployment();

        // Mint tokens to addr1 and addr2
        await token.transfer(addr1.address, 10000n * 10n ** 18n); // 10,000 tokens
        await token.transfer(addr2.address, 10000n * 10n ** 18n); // 10,000 tokens

        // Delegate voting power
        await token.connect(addr1).delegate(addr1.address);
        await token.connect(addr2).delegate(addr2.address);
    });

    it("Should allow Standard Voting (1T1V)", async function () {
        const grantAmount = 100n * 10n ** 18n;
        const transferCalldata = token.interface.encodeFunctionData("transfer", [addr2.address, grantAmount]);

        // Create Proposal (Standard Voting = 0)
        // We assume default `propose` uses Standard, or we can use the overloaded one if we exported it nicely.
        // Since we didn't add the overloaded `propose` to the interface in the test nicely yet, 
        // let's just use the standard propose first, which calls `super.propose`.
        // Wait, we added `proposalVotingType` map but we need to set it.
        // In MyGovernor.sol, we added: `function propose(..., VotingType _votingType)`
        // But `ethers.js` might have trouble distinguishing overloads without full signature.

        // Let's us the standard propose, which defaults to 0 (Standard) in the mapping implicitly?
        // No, mapping defaults to 0. 0 is Standard. So standard propose works for Standard.

        const tx = await governor.connect(addr1).propose(
            [await token.getAddress()],
            [0],
            [transferCalldata],
            "Proposal #1: Standard Vote"
        );
        const receipt = await tx.wait();

        // Get proposalId from event
        // Simplified extraction
        const log = receipt.logs.find(x => x.fragment && x.fragment.name === 'ProposalCreated');
        const proposalId = log.args[0];

        // Wait for voting delay
        await time.increase(7200); // Advance time (1 block is usually enough but let's be safe)

        // Vote
        // addr1 has 10,000 tokens. Weight should be 10,000.
        await governor.connect(addr1).castVote(proposalId, 1); // 1 = For

        const proposalVotes = await governor.proposalVotes(proposalId);
        expect(proposalVotes.forVotes).to.equal(10000n * 10n ** 18n);
    });

    it("Should allow Quadratic Voting", async function () {
        const grantAmount = 100n * 10n ** 18n;
        const transferCalldata = token.interface.encodeFunctionData("transfer", [addr2.address, grantAmount]);

        // We need to call the overloaded propose for Quadratic (VotingType = 1)
        // Signature: propose(address[],uint256[],bytes[],string,uint8)
        // Note: Enum in JS is uint8.

        const targets = [await token.getAddress()];
        const values = [0];
        const calldatas = [transferCalldata];
        const description = "Proposal #2: Quadratic Vote";
        const votingType = 1; // Quadratic

        const tx = await governor.connect(addr1)["propose(address[],uint256[],bytes[],string,uint8)"](
            targets, values, calldatas, description, votingType
        );
        const receipt = await tx.wait();
        const log = receipt.logs.find(x => x.fragment && x.fragment.name === 'ProposalCreated');
        const proposalId = log.args[0];

        await time.increase(7200);

        // Vote
        // addr1 has 10,000 tokens. sqrt(10,000) = 100.
        // Decimals are 18. So 10000 * 10^18.
        // sqrt(10000 * 10^18) = 100 * 10^9 = 10^11.

        // Let's use smaller numbers for easy math or just BigInt math.
        const balance = 10000n * 10n ** 18n;
        const expectedVotes = 100n * 10n ** 9n; // sqrt(10000) * sqrt(10^18) = 100 * 10^9

        await governor.connect(addr1).castVote(proposalId, 1);

        const proposalVotes = await governor.proposalVotes(proposalId);

        // Allow small margin of error for integer sqrt
        expect(proposalVotes.forVotes).to.equal(expectedVotes);
    });
});
