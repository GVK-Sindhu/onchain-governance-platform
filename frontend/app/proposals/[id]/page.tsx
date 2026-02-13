'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge'; // I should create this or use simple span
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Need to create Card

// Badge component inline for speed if not exists
function SimpleBadge({ children, className }: any) {
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${className}`}>{children}</span>;
}

// Fetch config helper
const fetchConfig = async () => {
    const [depRes, govRes, tokenRes] = await Promise.all([
        fetch('/deployments.json'),
        fetch('/abis/MyGovernor.json'),
        fetch('/abis/GovernanceToken.json')
    ]);
    const deployments = await depRes.json();
    const gov = await govRes.json();
    const token = await tokenRes.json();
    return {
        governorAddress: deployments.MyGovernor,
        tokenAddress: deployments.GovernanceToken,
        govAbi: gov.abi,
        tokenAbi: token.abi
    };
};

export default function ProposalDetails() {
    const { id } = useParams();
    const { address } = useAccount();
    const [config, setConfig] = useState<any>(null);
    const [proposalState, setProposalState] = useState<number | null>(null);
    const [votes, setVotes] = useState<any>(null);
    const [votingType, setVotingType] = useState<number>(0);
    const router = useRouter();

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        fetchConfig().then(setConfig).catch(console.error);
    }, []);

    // Read Contract Hooks - we need to use `useReadContract` but currently we need config first.
    // So we can't use top-level hooks easily with dynamic ABI/Address unless we use `skip` or `enabled`.
    // Or we use `useReadContracts` (plural) with a query.
    // For simplicity, I'll use `useEffect` and `readContract` from 'wagmi/actions' or just `useReadContract` with `query: { enabled: !!config }`.

    // Actually, explicit Read hooks are cleaner.
    const { data: stateData } = useReadContract({
        address: config?.governorAddress,
        abi: config?.govAbi,
        functionName: 'state',
        args: [BigInt(id as string)],
        query: { enabled: !!config && !!id, refetchInterval: 5000 }
    });

    const { data: votesData } = useReadContract({
        address: config?.governorAddress,
        abi: config?.govAbi,
        functionName: 'proposalVotes',
        args: [BigInt(id as string)],
        query: { enabled: !!config && !!id, refetchInterval: 5000 }
    });

    const { data: typeData } = useReadContract({
        address: config?.governorAddress,
        abi: config?.govAbi,
        functionName: 'proposalVotingType',
        args: [BigInt(id as string)],
        query: { enabled: !!config && !!id }
    });

    const { data: votingPower } = useReadContract({
        address: config?.tokenAddress,
        abi: config?.tokenAbi,
        functionName: 'getVotes',
        args: [address],
        query: { enabled: !!config && !!address }
    });

    const handleVote = async (support: number) => {
        if (!config) return;
        try {
            await writeContract({
                address: config.governorAddress,
                abi: config.govAbi,
                functionName: 'castVote',
                args: [BigInt(id as string), support],
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (!config) return <div className="p-10">Loading configuration...</div>;

    const stateMap = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
    const currentState = stateData !== undefined ? stateMap[Number(stateData)] : 'Loading...';

    // Parse votes
    // proposalVotes returns (against, for, abstain)
    const forVotes = votesData ? formatEther(votesData[1]) : '0';
    const againstVotes = votesData ? formatEther(votesData[0]) : '0';
    const abstainVotes = votesData ? formatEther(votesData[2]) : '0';

    const isQuadratic = Number(typeData) === 1;

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <Button variant="ghost" className="mb-4" onClick={() => router.push('/')}>&larr; Back to List</Button>

            <div className="bg-white dark:bg-gray-900 border rounded-lg p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold">Proposal #{id}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <SimpleBadge className="bg-blue-100 text-blue-800">{currentState}</SimpleBadge>
                            <SimpleBadge className="bg-purple-100 text-purple-800">{isQuadratic ? 'Quadratic Voting' : 'Standard Voting'}</SimpleBadge>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded">
                        <div className="text-sm text-green-600 font-medium">For</div>
                        <div className="text-xl font-bold">{parseFloat(forVotes).toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded">
                        <div className="text-sm text-red-600 font-medium">Against</div>
                        <div className="text-xl font-bold">{parseFloat(againstVotes).toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600 font-medium">Abstain</div>
                        <div className="text-xl font-bold">{parseFloat(abstainVotes).toFixed(2)}</div>
                    </div>
                </div>

                {currentState === 'Active' && (
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Cast Your Vote</h3>
                        <div className="mb-4 text-sm text-gray-500">
                            Your Voting Power: <span className="font-bold text-gray-900">{votingPower ? formatEther(votingPower as bigint) : '0'}</span>
                            {isQuadratic && " (Quadratic: Weight = Sqrt(Power))"}
                        </div>

                        <div className="flex gap-4">
                            <Button
                                data-testid="vote-for-button"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleVote(1)}
                                disabled={isPending || isConfirming}
                            >
                                Vote For
                            </Button>
                            <Button
                                data-testid="vote-against-button"
                                className="flex-1 bg-red-600 hover:bg-red-700"
                                onClick={() => handleVote(0)}
                                disabled={isPending || isConfirming}
                            >
                                Vote Against
                            </Button>
                            <Button
                                data-testid="vote-abstain-button"
                                className="flex-1 bg-gray-600 hover:bg-gray-700"
                                onClick={() => handleVote(2)}
                                disabled={isPending || isConfirming}
                            >
                                Abstain
                            </Button>
                        </div>
                        {isPending && <div className="mt-2 text-center text-sm text-blue-600">Transaction Pending...</div>}
                        {isConfirming && <div className="mt-2 text-center text-sm text-purple-600">Waiting for confirmation...</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
