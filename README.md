# Decentralized On-Chain Voting Platform

A full-stack DApp for on-chain governance using ERC-20 tokens. Supports Standard (1 Token = 1 Vote) and Quadratic Voting mechanisms.

## Project Structure

- `/contracts`: Solidity Smart Contracts (GovernanceToken, MyGovernor).
- `/frontend`: Next.js DApp for interacting with the governance system.
- `/scripts`: Deployment scripts.
- `/test`: Hardhat tests.

## Features

- **Governance Token**: ERC-20 token with voting capabilities (ERC20Votes).
- **Governor Contract**: Custom OpenZeppelin Governor supporting:
    - **Standard Voting**: 1 Token = 1 Vote.
    - **Quadratic Voting**: Vote Weight = Sqrt(Token Balance).
- **Frontend DApp**:
    - Connect Wallet.
    - View Proposals.
    - Create Proposals (Standard/Quadratic).
    - Vote (For, Against, Abstain).
    - Delegate Voting Power.
- **Dockerized**: Fully containerized environment for easy setup.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- MetaMask (or another Web3 wallet)

### Running the Application

1. **Clone the repository** (if not already done).
2. **Create .env file**:
   ```bash
   cp .env.example .env
   # You don't need to fill in keys for local docker run, but it's good practice.
   ```
3. **Start with Docker Compose**:
   ```bash
   docker-compose up --build
   ```
   
   This will start:
   - **Hardhat Node**: Local blockchain at `http://localhost:8545`.
   - **Deployer**: Automatically deploys contracts and seeds data.
   - **Frontend**: Accessible at `http://localhost:3000`.

### Interaction Guide

1. **Connect Wallet**:
   - Open `http://localhost:3000`.
   - Connect MetaMask to **Localhost 8545** (Chain ID: 31337).
   - Import a test account (e.g., `0xac09...` from Hardhat logs).

2. **Delegate**:
   - Use the "Delegate Voting Power" input on the home page to delegate to yourself (or others) to activate voting power.

3. **Create Proposal**:
   - Click "Create Proposal".
   - Enter description and choose Voting Mechanism.
   - Submit and confirm transaction.

4. **Vote**:
   - Click on a proposal.
   - Cast your vote.
   - Watch the results update.

## Testing

To run the smart contract tests locally (outside Docker):

```bash
npm install
npx hardhat test
```

## deployment assignments

- **GovernanceToken**: [See Console Logs]
- **MyGovernor**: [See Console Logs]
