'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ProposalList from '@/components/ProposalList';
import Delegate from '@/components/Delegate';

// Fetch deployments (Address) and ABI
const fetchConfig = async () => {
  try {
    const [depRes, govRes, tokenRes] = await Promise.all([
      fetch('/deployments.json'),
      fetch('/abis/MyGovernor.json'),
      fetch('/abis/GovernanceToken.json')
    ]);

    if (!depRes.ok || !govRes.ok) return null;

    const deployments = await depRes.json();
    const gov = await govRes.json();
    const token = await tokenRes.json();
    return {
      governorAddress: deployments.MyGovernor,
      tokenAddress: deployments.GovernanceToken,
      govAbi: gov.abi,
      tokenAbi: token.abi
    };
  } catch (e) {
    console.error("Failed to load config", e);
    return null;
  }
};

import { ConnectWallet } from '@/components/ConnectWallet';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig().then(setConfig).catch(console.error);
  }, []);

  if (!config) return (
    <div className="flex h-screen items-center justify-center p-10 flex-col gap-4">
      <div className="text-xl">Loading configuration...</div>
      <div className="text-sm text-gray-500">
        Ensure contracts are deployed and `deployments.json` exists in public/
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          On-Chain Governance
        </h1>
        <div className="flex gap-4 items-center">
          <ConnectWallet />
        </div>
      </header>

      {config && <Delegate tokenAddress={config.tokenAddress} abi={config.tokenAbi} />}

      <main className="space-y-8">
        <section className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Proposals</h2>
            <p className="text-gray-500 text-sm">Valid proposals created on-chain</p>
          </div>
          <Link href="/proposals/create">
            <Button>Create Proposal</Button>
          </Link>
        </section>

        <ProposalList governorAddress={config.governorAddress} abi={config.govAbi} />
      </main>
    </div>
  );
}
