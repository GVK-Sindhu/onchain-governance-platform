'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseEther } from 'viem';

// Fetch deployments (Address) and ABI
// We can duplicate the fetch logic or export it. For speed, duplicate locally or use a hook later.
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

export default function Create() {
    const router = useRouter();
    const [config, setConfig] = useState<any>(null);
    const [description, setDescription] = useState('');
    const [votingType, setVotingType] = useState('0'); // 0 = Standard, 1 = Quadratic

    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        fetchConfig().then(setConfig).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        // Proposal args: targets, values, calldatas, description, votingType
        // We will create a dummy proposal or a self-transfer 0 tokens proposal to make it valid.
        // Target: Token Address.
        // Value: 0.
        // Calldata: transfer(address(0), 0) ?? Or just empty.
        // But Governor might require executable proposal? Usually yes.
        // Let's use Token Address as target.
        const targets = [config.tokenAddress];
        const values = [BigInt(0)];
        // Empty calldata or encoded function?
        // Let's explicitly encode a transfer of 0 tokens to self or zero address.
        // For simplicity, just send 0 ETH (value 0) to token address with empty data.
        const calldatas = ["0x"];

        try {
            // Need to call the OVERLOADED propose function: propose(address[],uint256[],bytes[],string,uint8)
            // Viem handles overloads by signature?
            // "propose(address[],uint256[],bytes[],string,uint8)"

            await writeContract({
                address: config.governorAddress,
                abi: config.govAbi,
                functionName: 'propose',
                args: [targets, values, calldatas, description, parseInt(votingType)],
            });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (isSuccess) {
            router.push('/');
        }
    }, [isSuccess, router]);

    if (!config) return <div className="p-10">Loading...</div>;

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Create Proposal</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="description">Proposal Description</Label>
                    <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Allocate funds to marketing..."
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">Voting Mechanism</Label>
                    <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={votingType}
                        onChange={(e) => setVotingType(e.target.value)}
                    >
                        <option value="0">Standard (1 Token = 1 Vote)</option>
                        <option value="1">Quadratic (Sqrt(Balance) = Votes)</option>
                    </select>
                </div>

                <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
                    <p>Note: To submit a proposal, you must have enough voting power (Tokens delegated to yourself) to meet the Proposal Threshold.</p>
                </div>

                <Button type="submit" disabled={isPending || isConfirming} className="w-full">
                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Submit Proposal'}
                </Button>

                {error && (
                    <div className="text-red-500 text-sm mt-2">
                        Error: {(error as any).shortMessage || error.message}
                    </div>
                )}
            </form>
        </div>
    );
}
