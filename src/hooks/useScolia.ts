import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseScoliaProps {
    serialNumber?: string;
    accessToken?: string;
    isEnabled: boolean;
    onThrow: (score: number, multiplier: number, value: number) => void;
}

interface ConnectionLog {
    timestamp: string;
    type: 'info' | 'error' | 'warning';
    message: string;
    details?: any;
}

export const useScolia = ({ serialNumber, accessToken, isEnabled, onThrow }: UseScoliaProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);

    const addLog = useCallback((type: 'info' | 'error' | 'warning', message: string, details?: any) => {
        const timestamp = new Date().toISOString();
        const log: ConnectionLog = { timestamp, type, message, details };
        
        setConnectionLogs(prev => [...prev.slice(-49), log]); // Keep last 50 logs
        
        // Console logging with colors
        const prefix = '[Scolia]';
        const timeStr = new Date().toLocaleTimeString();
        
        if (type === 'error') {
            console.error(`${prefix} [${timeStr}] ❌`, message, details || '');
        } else if (type === 'warning') {
            console.warn(`${prefix} [${timeStr}] ⚠️`, message, details || '');
        } else {
            console.log(`${prefix} [${timeStr}] ℹ️`, message, details || '');
        }
    }, []);

    const connect = useCallback(() => {
        if (!isEnabled || !serialNumber || !accessToken) {
            addLog('warning', 'Cannot connect: Missing credentials or disabled');
            return;
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            addLog('info', 'Already connected');
            return;
        }

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        addLog('info', `Connecting to Scolia...`, { serialNumber, hasToken: !!accessToken });

        const url = `wss://game.scoliadarts.com/api/v1/social?serialNumber=${serialNumber}&accessToken=${accessToken}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            addLog('info', '✅ Connected successfully');
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            toast.success('Scolia Csatlakoztatva!');
        };

        ws.onclose = (event) => {
            const reason = event.reason || 'No reason provided';
            const wasClean = event.wasClean ? 'clean' : 'unclean';
            
            addLog('warning', `Disconnected (${wasClean})`, { 
                code: event.code, 
                reason,
                wasClean: event.wasClean 
            });
            
            setIsConnected(false);

            if (event.code !== 1000) {
                toast.error(`Scolia Megszakadt (${event.code})`);
            }
        };

        ws.onerror = (error) => {
            addLog('error', 'WebSocket error occurred', error);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                addLog('info', 'Message received', { type: message.type });
                handleMessage(message);
            } catch (e) {
                addLog('error', 'Failed to parse message', { error: e, data: event.data });
            }
        };
    }, [isEnabled, serialNumber, accessToken, addLog]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            addLog('info', 'Disconnecting...');
            wsRef.current.close(1000, 'User initiated disconnect');
            wsRef.current = null;
            setIsConnected(false);
        }
    }, [addLog]);

    const reconnect = useCallback(() => {
        addLog('info', 'Manual reconnection initiated');
        reconnectAttemptsRef.current = 0;
        disconnect();
        setTimeout(() => {
            connect();
        }, 500);
    }, [connect, disconnect, addLog]);

    useEffect(() => {
        if (isEnabled && serialNumber && accessToken) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [isEnabled, serialNumber, accessToken]);

    const handleMessage = (message: any) => {
        if (message.type === 'THROW_DETECTED') {
            const { sector, bounceout } = message.payload;
            
            if (bounceout) {
                addLog('info', 'Throw detected: Bounceout');
                onThrow(0, 1, 0);
                return;
            }
            
            const parsed = parseSector(sector);
            if (parsed) {
                addLog('info', `Throw detected: ${sector} = ${parsed.score} points`, parsed);
                onThrow(parsed.score, parsed.multiplier, parsed.value);
            } else {
                addLog('warning', `Failed to parse sector: ${sector}`);
            }
        }
    };

    const parseSector = (sector: string): { score: number, multiplier: number, value: number } | null => {
        if (sector === 'None' || !sector) return { score: 0, multiplier: 1, value: 0 };
        if (sector === 'Bull') return { score: 50, multiplier: 1, value: 50 };
        if (sector === '25') return { score: 25, multiplier: 1, value: 25 };

        const match = sector.match(/^([SDT])(\d+)$/i);
        if (match) {
            const [, type, valStr] = match;
            const value = parseInt(valStr, 10);
            let multiplier = 1;
            if (type.toUpperCase() === 'D') multiplier = 2;
            if (type.toUpperCase() === 'T') multiplier = 3;
            
            return {
                score: value * multiplier,
                multiplier,
                value
            };
        }
        
        return null;
    };

    return { 
        isConnected, 
        reconnect, 
        connectionLogs,
        disconnect 
    };
};
