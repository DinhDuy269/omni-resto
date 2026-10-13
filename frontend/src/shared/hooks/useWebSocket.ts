import { useEffect, useRef, useState } from 'react';
import type { Order } from '../types/admin';

export interface OrderEventMessage {
  event_type?: string;
  eventType?: string;
  order: Order;
}

export const useWebSocket = (
  onOrderEvent?: (event: OrderEventMessage & { eventType: string; order: Order }) => void
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
        const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws-raw`;

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
              const data = JSON.parse(event.data);
              const eventType = data.eventType || data.event_type || 'ORDER_STATUS_CHANGED';
              onOrderEvent({
                ...data,
                eventType,
                event_type: eventType,
                order: data.order,
              });
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
