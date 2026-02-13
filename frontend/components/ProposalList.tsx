"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { Button } from '@/components/ui/button';

// Since I might not have created Badge, I'll inline a simple one or use tailwind classes.
function SimpleBadge({ children, className }: any) {
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${className}`}>{children}</span>;
}

export default function ProposalList({ governorAddress, abi }: { governorAddress: string | any, abi: any }) {
    const publicClient = usePublicClient();
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const ProposalState = [
        "Pending",
        "Active",
        "Canceled",
        "Defeated",
        "Succeeded",
        "Queued",
        "Expired",
        "Executed"
    ];

    useEffect(() => {
        if (!publicClient || !governorAddress || !abi) return;

        const fetchProposals = async () => {
            try {
                const logs = await publicClient.getLogs({
                    address: governorAddress,
                    event: parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
                    fromBlock: 'earliest',
                    toBlock: 'latest'
                });

                // Fetch state for each proposal
                const proposalsWithState = await Promise.all(logs.map(async (log: any) => {
                    const { proposalId } = log.args;
                    let state = "Unknown";
                    try {
                        // state(proposalId) returns enum
                        const stateEnum = await publicClient.readContract({
                            address: governorAddress,
                            abi: abi,
                            functionName: 'state',
                            args: [proposalId]
                        }) as number;
                        state = ProposalState[stateEnum] || "Unknown";
                    } catch (e) {
                        console.error(`Failed to fetch state for ${proposalId}`, e);
                    }
                    return { ...log, state };
                }));

                const sortedLogs = proposalsWithState.sort((a: any, b: any) => Number(b.args.proposalId) - Number(a.args.proposalId));
                setProposals(sortedLogs);
            } catch (e) {
                console.error("Error fetching proposals:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchProposals();
        const interval = setInterval(fetchProposals, 10000);
        return () => clearInterval(interval);
    }, [publicClient, governorAddress, abi]);

    if (loading) return <div>Loading proposals...</div>;
    if (proposals.length === 0) return <div>No proposals found.</div>;

    return (
        <div className="grid gap-4">
            {proposals.map((item: any) => {
                const { proposalId, description, voteStart } = item.args;
                const { state } = item;
                const shortDesc = description?.length > 100 ? description.substring(0, 100) + '...' : description;

                return (
                    <div key={proposalId.toString()} data-testid="proposal-list-item" className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">Proposal #{proposalId.toString()}</h3>
                            <SimpleBadge className={`
                                ${state === 'Active' ? 'bg-green-100 text-green-800' : ''}
                                ${state === 'Defeated' ? 'bg-red-100 text-red-800' : ''}
                                ${state === 'Succeeded' ? 'bg-blue-100 text-blue-800' : ''}
                                ${state === 'Executed' ? 'bg-purple-100 text-purple-800' : ''}
                                ${state === 'Pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            `}>{state}</SimpleBadge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">{shortDesc}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Start: Block {voteStart.toString()}</span>
                            <Link href={`/proposals/${proposalId.toString()}`}>
                                <Button variant="outline" size="sm">View Details & Vote</Button>
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
