// P2P 和聊天相关类型

export interface Peer {
  peer_id: string;
  public_key: string;
  name: string;
  address: string | null;
  status: 'online' | 'offline' | 'connecting';
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  timestamp: number;
  status: 'sent' | 'received' | 'delivered' | 'read' | 'failed';
}

export interface P2PEvent {
  type: string;
  peer_id?: string;
  address?: string;
  from_peer_id?: string;
  from_name?: string;
  content?: string;
  timestamp?: number;
  message_id?: string;
  public_key?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  peer_id: string;
  peer_name: string;
  last_message: string | null;
  last_message_time: number | null;
  unread_count: number;
}
