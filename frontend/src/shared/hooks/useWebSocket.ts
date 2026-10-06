import { useEffect, useRef, useState } from 'react';
import type { Order } from '../types/admin';

export interface OrderEventMessage {
  eventType: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED';
  order: Order;
}

export const useWebSocket = (
  onOrderEvent?: (event: OrderEventMessage) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to backend ws-raw endpoint or proxied /ws-raw
        const wsUrl = import.meta.env.PROD 
          ? `${protocol}//${window.location.host}/ws-raw`
          : `ws://localhost:8080/ws-raw`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
            console.log('⚡ WebSockets connected successfully to OmniResto Server');
          }
        };

        ws.onmessage = (event) => {
          if (isMounted && onOrderEvent) {
            try {
              const data: OrderEventMessage = JSON.parse(event.data);
              onOrderEvent(data);
            } catch (err) {
              console.warn('Failed to parse WebSocket message:', err);
            }
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            // Attempt auto-reconnect after 5 seconds
            reconnectTimerRef.current = setTimeout(connect, 5000);
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket connection error:', err);
          ws.close();
        };
      } catch (e) {
        console.warn('Could not establish WebSocket connection:', e);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return { isConnected };
};
