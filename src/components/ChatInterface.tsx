import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Peer, Message } from '../lib/types';

interface ChatInterfaceProps {
  localPeerId: string;
  localPublicKey: string;
  conversationMessages: Map<string, Message[]>;
  setConversationMessages: React.Dispatch<React.SetStateAction<Map<string, Message[]>>>;
}

export function ChatInterface({ 
  localPeerId, 
  localPublicKey: _localPublicKey,
  conversationMessages,
  setConversationMessages 
}: ChatInterfaceProps) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  // conversationMessages 现在从父组件传入
  const [inputMessage, setInputMessage] = useState('');
  const [showAddPeer, setShowAddPeer] = useState(false);
  const [newPeerId, setNewPeerId] = useState('');
  const [newPeerName, setNewPeerName] = useState('');
  const [showPeerId, setShowPeerId] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 获取连接的 Peer 列表
  const refreshConnectedPeers = async () => {
    try {
      const peers = await invoke<string[]>('get_connected_peers');
      setConnectedPeers(peers);
      console.log('🔗 已连接的 Peer:', peers);
      return peers;
    } catch (err) {
      console.error('❌ 获取连接 Peer 失败:', err);
      return [];
    }
  };
  
  // 加载历史消息
  const loadHistoryMessages = async (peerId: string) => {
    if (!peerId || loadingMessages) return;
    
    setLoadingMessages(true);
    try {
      const messages = await invoke<any[]>('get_messages', {
        conversationId: peerId,
        limit: 100
      });
      
      console.log(`📚 加载了 ${messages.length} 条历史消息`);
      
      // 将历史消息添加到 conversationMessages
      setConversationMessages(prev => {
        const newMap = new Map(prev);
        const currentMessages = newMap.get(peerId) || [];
        
        // 去重：只添加不存在的消息
        const newMessages = messages.filter(msg => 
          !currentMessages.some(m => m.id === msg.id)
        );
        
        if (newMessages.length > 0) {
          newMap.set(peerId, [...currentMessages, ...newMessages]);
          console.log(`✅ 添加了 ${newMessages.length} 条新消息`);
        }
        
        return newMap;
      });
    } catch (err) {
      console.error('❌ 加载历史消息失败:', err);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // 当选中联系人时，加载历史消息
  useEffect(() => {
    if (selectedPeer?.peer_id) {
      loadHistoryMessages(selectedPeer.peer_id);
    }
  }, [selectedPeer?.peer_id]);
  
  // 自动刷新连接状态（每秒检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      if (showDebug) {
        refreshConnectedPeers();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showDebug]);

  // 监听来自后端的消息
  // 注意：实际应该使用 Tauri 的事件监听，这里简化处理
  // 消息会通过后端的事件系统推送到前端

  // 获取当前选中联系人的消息
  const messages = selectedPeer ? (conversationMessages.get(selectedPeer.peer_id) || []) : [];
  
  // 调试：输出当前状态
  useEffect(() => {
    if (selectedPeer) {
      console.log('========================================');
      console.log('🔍 [调试] 当前选中的联系人:', selectedPeer.peer_id);
      console.log('🔍 [调试] 该联系人的消息数:', messages.length);
      console.log('🔍 [调试] 所有对话 IDs:', Array.from(conversationMessages.keys()));
      conversationMessages.forEach((msgs, peerId) => {
        console.log(`   - ${peerId}: ${msgs.length} 条消息`);
        if (msgs.length > 0) {
          console.log(`     第一条：${msgs[0].content}`);
          console.log(`     最后一条：${msgs[msgs.length - 1].content}`);
        }
      });
      
      // 检查是否匹配
      const storedMessages = conversationMessages.get(selectedPeer.peer_id);
      console.log('🔍 [调试] 直接从 Map 获取的消息数:', storedMessages?.length || 0);
      console.log('🔍 [调试] messages === storedMessages:', messages === storedMessages);
      console.log('========================================');
    }
  }, [selectedPeer, messages.length, conversationMessages]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedPeer) return;

    console.log('📤 准备发送消息到:', selectedPeer.peer_id);
    console.log('消息内容:', inputMessage);

    try {
      // 调用后端 P2P API 发送消息
      const messageId = await invoke<string>('send_chat_message', {
        peerId: selectedPeer.peer_id,
        content: inputMessage,
      });

      console.log('✅ 消息发送成功，ID:', messageId);

      const newMessage: Message = {
        id: messageId,
        conversation_id: selectedPeer.peer_id,
        sender_id: localPeerId,
        sender_name: 'Me',
        content: inputMessage,
        message_type: 'text',
        timestamp: Date.now(),
        status: 'sent',
      };
      
      // 更新当前联系人的消息
      setConversationMessages(prev => {
        const newMap = new Map(prev);
        const currentMessages = newMap.get(selectedPeer.peer_id) || [];
        newMap.set(selectedPeer.peer_id, [...currentMessages, newMessage]);
        return newMap;
      });
      
      setInputMessage('');
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      console.error('错误类型:', typeof error);
      console.error('错误详情:', JSON.stringify(error));
      alert('发送失败：' + error);
    }
  };

  const handleAddPeer = () => {
    if (!newPeerId.trim()) return;

    // 检查是否已存在
    const exists = peers.some(p => p.peer_id === newPeerId);
    if (exists) {
      alert('该联系人已存在！');
      return;
    }

    const newPeer: Peer = {
      peer_id: newPeerId,
      public_key: '',
      name: newPeerName || `Peer ${newPeerId.slice(0, 8)}`,
      address: null,
      status: 'online',
    };

    setPeers(prev => [...prev, newPeer]);
    setShowAddPeer(false);
    setNewPeerId('');
    setNewPeerName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // 测试消息接收（模拟收到消息）
  const testReceiveMessage = () => {
    const testMessage: Message = {
      id: 'test-' + Date.now(),
      conversation_id: selectedPeer?.peer_id || 'test-peer',
      sender_id: selectedPeer?.peer_id || 'test-peer',
      sender_name: selectedPeer?.name || 'Test Peer',
      content: '🧪 测试消息 ' + new Date().toLocaleTimeString(),
      message_type: 'text',
      timestamp: Date.now(),
      status: 'received',
    };
    
    setConversationMessages(prev => {
      const newMap = new Map(prev);
      const currentMessages = newMap.get(testMessage.conversation_id) || [];
      newMap.set(testMessage.conversation_id, [...currentMessages, testMessage]);
      return newMap;
    });
    console.log('🧪 测试消息已添加');
  };

  const generateTestPeerId = () => {
    const testPeer: Peer = {
      peer_id: '16Uiu2HAmTest' + Math.random().toString(36).slice(2),
      public_key: 'test-public-key',
      name: '测试联系人 ' + (peers.length + 1),
      address: '127.0.0.1:4001',
      status: 'online',
    };
    setPeers(prev => [...prev, testPeer]);
  };

  // 获取联系人的最后一条消息
  const getLastMessage = (peerId: string) => {
    const msgs = conversationMessages.get(peerId);
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* 侧边栏 */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white mb-2">Nebula Chat</h2>
          <div className="text-xs text-gray-400">
            <div className="truncate">ID: {localPeerId}</div>
          </div>
        </div>

        {/* 添加联系人按钮 */}
        <div className="p-2 border-b border-gray-700 flex gap-2">
          <button
            onClick={() => setShowAddPeer(!showAddPeer)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + 添加
          </button>
          <button
            onClick={generateTestPeerId}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🧪 测试
          </button>
        </div>

        {/* 添加联系人表单 */}
        {showAddPeer && (
          <div className="p-3 border-b border-gray-700 bg-gray-750 space-y-2">
            <input
              type="text"
              placeholder="联系人名称"
              value={newPeerName}
              onChange={(e) => setNewPeerName(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Peer ID"
              value={newPeerId}
              onChange={(e) => setNewPeerId(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
            />
            <button
              onClick={handleAddPeer}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
            >
              添加
            </button>
          </div>
        )}

        {/* 联系人列表 */}
        <div className="flex-1 overflow-y-auto">
          {peers.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm text-center">
              暂无联系人
              <br />
              <button 
                onClick={generateTestPeerId}
                className="mt-2 text-blue-400 hover:text-blue-300 underline"
              >
                添加测试联系人
              </button>
            </div>
          ) : (
            peers.map((peer) => {
              const lastMsg = getLastMessage(peer.peer_id);
              return (
                <div
                  key={peer.peer_id}
                  onClick={() => setSelectedPeer(peer)}
                  className={`p-3 border-b border-gray-700 cursor-pointer transition-colors ${
                    selectedPeer?.peer_id === peer.peer_id
                      ? 'bg-blue-600 bg-opacity-20'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      peer.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{peer.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {lastMsg ? (
                          <span className={lastMsg.sender_id === localPeerId ? 'text-blue-400' : ''}>
                            {lastMsg.sender_id === localPeerId ? '我：' : ''}{lastMsg.content.slice(0, 20)}
                          </span>
                        ) : (
                          peer.peer_id.slice(0, 16) + '...'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedPeer ? (
          <>
            {/* 头部 */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <h3 className="text-white font-bold">{selectedPeer.name}</h3>
                    <div className="text-xs text-gray-400">{selectedPeer.peer_id.slice(0, 32)}...</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPeerId(!showPeerId)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
                    title="查看我的 Peer ID"
                  >
                    👤 我的 ID
                  </button>
                  <button
                    onClick={() => { refreshConnectedPeers(); setShowDebug(!showDebug); }}
                    className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded transition-colors"
                    title="调试工具"
                  >
                    🐛 调试
                  </button>
                </div>
              </div>
              
              {/* 显示本地 Peer ID */}
              {showPeerId && (
                <div className="mt-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">我的 Peer ID (点击复制):</div>
                  <div 
                    className="text-xs text-blue-400 font-mono break-all cursor-pointer hover:text-blue-300"
                    onClick={() => {
                      navigator.clipboard.writeText(localPeerId);
                      alert('Peer ID 已复制!');
                    }}
                    title="点击复制"
                  >
                    {localPeerId}
                  </div>
                </div>
              )}
              
              {/* 调试面板 */}
              {showDebug && (
                <div className="mt-3 p-3 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-600 space-y-2">
                  <div className="text-xs text-purple-300 font-bold mb-2">🐛 调试工具</div>
                  
                  <div className="text-xs text-gray-300">
                    <div>已连接 Peer 数：<span className="text-green-400">{connectedPeers.length}</span></div>
                    {connectedPeers.length > 0 && (
                      <div className="mt-1 font-mono text-purple-200 break-all">
                        {connectedPeers.map(p => p.slice(0, 20) + '...').join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={refreshConnectedPeers}
                      className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded transition-colors"
                    >
                      🔄 刷新连接
                    </button>
                    
                    <button
                      onClick={testReceiveMessage}
                      className="text-xs bg-pink-700 hover:bg-pink-600 text-white px-3 py-1 rounded transition-colors"
                      title="测试消息接收（模拟）"
                    >
                      🧪 测试消息
                    </button>
                  </div>
                  
                  {selectedPeer && (
                    <button
                      onClick={async () => {
                        try {
                          await invoke('reconnect_to_peer', { peerId: selectedPeer.peer_id });
                          alert('正在尝试重连...');
                        } catch (err) {
                          alert('重连失败：' + err);
                        }
                      }}
                      className="text-xs bg-orange-700 hover:bg-orange-600 text-white px-3 py-1 rounded transition-colors w-full"
                    >
                      🔄 重连到 {selectedPeer.name}
                    </button>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    💡 提示：按 L 键显示完整日志
                  </div>
                </div>
              )}
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-8">
                  💬 发送第一条消息
                  <div className="text-xs mt-2 text-gray-400">
                    调试：conversationMessages 有 {Array.from(conversationMessages.keys()).length} 个对话
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === localPeerId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.sender_id === localPeerId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-xs opacity-60 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  发送
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-lg">选择一个联系人开始聊天</div>
              <div className="text-sm mt-2">或点击"🧪 测试"添加测试联系人</div>
              
              {/* 显示本地 Peer ID */}
              <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700 max-w-md">
                <div className="text-xs text-gray-400 mb-2">我的 Peer ID (点击复制):</div>
                <div 
                  className="text-xs text-blue-400 font-mono break-all cursor-pointer hover:text-blue-300"
                  onClick={() => {
                    navigator.clipboard.writeText(localPeerId);
                    alert('Peer ID 已复制到剪贴板!');
                  }}
                  title="点击复制"
                >
                  {localPeerId}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  将此 ID 分享给他人，让他们添加您为联系人
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
