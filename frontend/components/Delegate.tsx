"use client";

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Delegate({ tokenAddress, abi }: { tokenAddress: string, abi: any }) {
    const [delegatee, setDelegatee] = useState('');
    const { writeContract, isPending } = useWriteContract();

    const handleDelegate = async () => {
        try {
            await writeContract({
                address: tokenAddress as `0x${string}`,
                abi: abi,
                functionName: 'delegate',
                args: [delegatee],
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-4 border rounded bg-gray-50 flex gap-2 items-end">
            <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Delegate Voting Power</label>
                <Input
                    placeholder="Delegatee Address (0x...)"
                    value={delegatee}
                    onChange={(e) => setDelegatee(e.target.value)}
                />
            </div>
            <Button onClick={handleDelegate} disabled={isPending || !delegatee}>
                {isPending ? 'Delegating...' : 'Delegate'}
            </Button>
        </div>
    );
}
