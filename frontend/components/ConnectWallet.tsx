'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';

export function ConnectWallet() {
    const { address, isConnected } = useAccount();
    const { connectors, connect } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected) {
        return (
            <div className="flex items-center gap-4">
                <span data-testid="user-address" className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
                    {address}
                </span>
                <Button variant="outline" onClick={() => disconnect()}>
                    Disconnect
                </Button>
            </div>
        );
    }

    // Find MetaMask or Injected connector
    const connector = connectors.find((c) => c.name === 'MetaMask') || connectors[0];

    return (
        <Button
            data-testid="connect-wallet-button"
            onClick={() => connect({ connector })}
        >
            Connect Wallet
        </Button>
    );
}
