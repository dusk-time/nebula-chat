// Tauri API 调用封装
import { invoke } from '@tauri-apps/api/core';
import type { Peer, Message, P2PEvent } from './types';

// P2P 相关 API
export async function startP2PEngine(secretKey: string, name: string): Promise<void> {
  await invoke('start_p2p_engine', { secretKey, name });
}

export async function sendChatMessage(peerId: string, content: string): Promise<string> {
  return await invoke('send_chat_message', { peerId, content });
}

export async function sendContactRequest(peerId: string): Promise<void> {
  await invoke('send_contact_request', { peerId });
}

export async function getPeers(): Promise<Peer[]> {
  return await invoke('get_peers');
}

export async function addPeerManually(peerId: string, address: string, name?: string): Promise<void> {
  await invoke('add_peer_manually', { peerId, address, name });
}

// 消息相关 API
export async function getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
  return await invoke('get_messages', { conversationId, limit });
}

export async function sendMessage(recipient: string, content: string, messageType: string = 'text'): Promise<string> {
  return await invoke('send_message', { recipient, content, messageType });
}

// 联系人相关 API
export async function listContacts(): Promise<Peer[]> {
  return await invoke('list_contacts');
}

export async function addContact(name: string, publicKey: string): Promise<Peer> {
  return await invoke('add_contact', { name, publicKey });
}

export async function removeContact(contactId: string): Promise<void> {
  await invoke('remove_contact', { contactId });
}

// 身份相关 API
export async function generateIdentity(username: string): Promise<{ public_key: string; secret_key: string; name: string; created_at: number }> {
  return await invoke('generate_identity', { username });
}

export async function exportIdentity(): Promise<any> {
  return await invoke('export_identity');
}

export async function importContact(identityJson: string): Promise<any> {
  return await invoke('import_contact', { identityJson });
}

// 监听 P2P 事件（通过 Tauri 事件系统）
export function listenToP2PEvents(_callback: (event: P2PEvent) => void) {
  // 这里需要使用 Tauri 的事件监听 API
  // 实际实现需要在后端 emit 事件
  console.log('P2P event listener registered');
}
