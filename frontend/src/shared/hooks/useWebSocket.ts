import { useEffect, useRef, useState } from 'react';
import type { Order } from '../types/admin';

export interface WebSocketEventMessage {
  event_type: string;
  eventType: string;
  order?: Order;
  
  menu_item?: any;

  item_id?: string;
  status?: string;
  [key: string]: any;
}

export type OrderEventMessage = WebSocketEventMessage;

export const useWebSocket = (
  onEvent?: (event: WebSocketEventMessage) => void
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
          if (isMounted && onEvent) {
            try {
              const data = JSON.parse(event.data);
              const event_type = data.event_type || data.eventType || 'UNKNOWN';
              onEvent({
                ...data,
                event_type,
                eventType: event_type,
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
      if (socketRef.current) {
        // Thực hiện Graceful Disconnect theo chuẩn RFC 6455
        // Tránh ngắt đột ngột khi socket đang trong quá trình CONNECTING gây ra ECONNABORTED
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, 'Component unmounted');
        } else if (socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.onopen = () => {
            socketRef.current?.close(1000, 'Component unmounted');
          };
        }
      }
    };
  }, []);

  return { isConnected };
};
