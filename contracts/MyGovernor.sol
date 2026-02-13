// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract MyGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    
    enum VotingType { Standard, Quadratic }
    
    // Mapping from proposalId to its voting type
    mapping(uint256 => VotingType) public proposalVotingType;

    constructor(IVotes _token)
        Governor("MyGovernor")
        GovernorSettings(1 /* 1 block */, 50400 /* 1 week */, 100e18) // Threshold: 100 Tokens
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
    {}

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    // Override propose to accept VotingType
    // Note: Standard Governor 'propose' doesn't take extra args easily without encoding. 
    // For simplicity, we'll store the type after creation or use a custom propose function. 
    // However, to keep it compatible with standard tooling, we might need to rely on a separate setter 
    // or just assume all are Standard for now, BUT the requirement usually implies we need to support both.
    // Let's create a custom function `proposeWithType` or just use the standard one and default to Standard, 
    // and maybe allow changing it? Or better, just overload it if possible, but Governor's propose is virtual.
    
    // Let's try to overload propose.
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        VotingType _votingType
    ) public returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        proposalVotingType[proposalId] = _votingType;
        return proposalId;
    }

    // We also need to override the standard propose to default to Standard if called directly
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory params
    ) internal override(Governor, GovernorCountingSimple) returns (uint256) {
        // Implement Quadratic Voting Logic here
        VotingType vType = proposalVotingType[proposalId];
        
        if (vType == VotingType.Quadratic) {
            // Cost = Votes^2.  So Votes = Sqrt(Cost).
            // Here 'weight' is the raw token balance (cost).
            // We need to calculate the effective votes = sqrt(weight).
            
            uint256 effectiveVotes = Math.sqrt(weight);
            
            return super._countVote(proposalId, account, support, effectiveVotes, params);
        } else {
            // Standard Voting (1 Token = 1 Vote)
            return super._countVote(proposalId, account, support, weight, params);
        }
    }
}
