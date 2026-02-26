import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { Onboarding } from './components/Onboarding';
import { ChatInterface } from './components/ChatInterface';
import type { Message } from './lib/types';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [peerId, setPeerId] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  // 全局消息存储 - 按对话 ID 分组
  const [conversationMessages, setConversationMessages] = useState<Map<string, Message[]>>(new Map());

  // 调试日志工具
  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev, logMessage]);
  };

  // 检查是否已有保存的身份并启动 P2P 引擎
  useEffect(() => {
    const unlistenFns: UnlistenFn[] = [];
    
    const initApp = async () => {
      // 🚨 启动诊断：检查关键资源
      log('🔍 [诊断] 应用启动，检查环境...');
      log(`📦 [诊断] User Agent: ${navigator.userAgent}`);
      log(`🎨 [诊断] 背景色：${getComputedStyle(document.body).backgroundColor}`);
      log(`📐 [诊断] 窗口尺寸：${window.innerWidth}x${window.innerHeight}`);
      
      // 检查 React 是否正常渲染
      const root = document.getElementById('root');
      log(`📌 [诊断] Root 元素：${root ? '✅ 存在' : '❌ 不存在'}`);
      if (root) {
        log(`📏 [诊断] Root 尺寸：${root.clientWidth}x${root.clientHeight}`);
        log(`🎨 [诊断] Root 背景：${getComputedStyle(root).backgroundColor}`);
      }
      
      log('🔍 [前端] 应用启动，检查保存的身份...');
      
      const savedIdentity = localStorage.getItem('nebula_identity');
      
      if (savedIdentity) {
        try {
          const data = JSON.parse(savedIdentity);
          const secretKey = data.secretKey || data.secret_key;
          const publicKey = data.publicKey || data.public_key;
          const username = data.username || data.name;
          
          log(`🔑 [前端] 找到保存的身份 - 用户：${username}, 密钥：${secretKey?.substring(0, 20)}...`);
          
          // 检查是否是假密钥或格式不对
          const isValidKey = secretKey && 
                             secretKey !== 'generated-secret-key' && 
                             secretKey.startsWith('ed25519:') &&
                             secretKey.length > 20;
          
          if (!isValidKey) {
            log('⚠️ [前端] 检测到无效的密钥，清除旧数据');
            localStorage.removeItem('nebula_identity');
            return;
          }
          
          setSecretKey(secretKey);
          setPublicKey(publicKey || '');
          setUsername(username || '');
          
          // 先检查后端 P2P 引擎状态
          try {
            const debugInfo = await invoke<any>('get_p2p_debug_info');
            log(`📊 [前端] 后端 P2P 状态：${JSON.stringify(debugInfo)}`);
            
            if (debugInfo.started) {
              log('ℹ️ [前端] P2P 引擎已启动，使用现有实例');
              setPeerId(debugInfo.peer_id);
              setInitialized(true);
              return;
            }
          } catch (err) {
            log('⚠️ [前端] 无法获取后端 P2P 状态，尝试启动...');
          }
          
          // 启动 P2P 引擎
          try {
            log('🚀 [前端] 调用 start_p2p_engine...');
            const pid = await invoke<string>('start_p2p_engine', {
              secretKey: secretKey,
              name: username,
            });
            log(`✅ [前端] P2P 引擎已启动，Peer ID: ${pid}`);
            setPeerId(pid);
            setInitialized(true);
          } catch (err: any) {
            const errMsg = String(err);
            if (errMsg.includes('already started')) {
              log('ℹ️ [前端] P2P 引擎已启动，使用现有实例');
              setPeerId('已启动');
              setInitialized(true);
            } else {
              log(`❌ [前端] P2P 引擎启动失败：${errMsg}`);
              localStorage.removeItem('nebula_identity');
            }
          }
        } catch (err) {
          log(`❌ [前端] 身份解析失败：${err}`);
          localStorage.removeItem('nebula_identity');
        }
      } else {
        log('ℹ️ [前端] 没有找到保存的身份，显示 Onboarding');
      }
    };
    
    // 设置 P2P 事件监听 - 必须在启动引擎之前设置！
    const setupEventListeners = async () => {
      log('📡 [前端] 设置 P2P 事件监听...');
      
      // 监听收到消息事件 - 更新全局消息状态
      const unlistenMessageReceived = await listen('p2p-message-received', (event: any) => {
        const payload = event.payload;
        console.log('========================================');
        console.log('📬 [前端] 收到消息事件！');
        console.log('   from_peer_id:', payload.from_peer_id);
        console.log('   from_name:', payload.from_name);
        console.log('   content:', payload.content);
        console.log('   timestamp:', payload.timestamp);
        console.log('   message_id:', payload.message_id);
        console.log('========================================');
        
        log(`📬 [前端] 收到消息事件：${JSON.stringify(event.payload)}`);
        console.log('💬 收到消息:', event.payload);
        
        // 将收到的消息添加到 conversationMessages
        const newMessage: Message = {
          id: payload.message_id,
          conversation_id: payload.from_peer_id,
          sender_id: payload.from_peer_id,
          sender_name: payload.from_name,
          content: payload.content,
          message_type: 'text',
          timestamp: payload.timestamp * 1000, // 后端是秒，前端需要毫秒
          status: 'received',
        };
        
        console.log('📝 准备添加消息到 conversationMessages:', newMessage);
        console.log('   conversation_id:', newMessage.conversation_id);
        
        setConversationMessages(prev => {
          const newMap = new Map(prev);
          const currentMessages = newMap.get(payload.from_peer_id) || [];
          
          // 去重：检查消息是否已存在
          const exists = currentMessages.some(msg => msg.id === payload.message_id);
          if (exists) {
            console.log('⚠️ 消息已存在，跳过添加:', payload.message_id);
            return newMap;
          }
          
          console.log('   当前对话已有消息数:', currentMessages.length);
          newMap.set(payload.from_peer_id, [...currentMessages, newMessage]);
          console.log('   ✅ 消息已添加，现在消息数:', newMap.get(payload.from_peer_id)?.length);
          console.log('   当前所有对话 IDs:', Array.from(newMap.keys()));
          return newMap;
        });
        
        log(`✅ [前端] 消息已添加到对话：${payload.from_peer_id}`);
        console.log('========================================');
      });
      unlistenFns.push(unlistenMessageReceived);
      
      // 监听消息发送事件
      const unlistenMessageSent = await listen('p2p-message-sent', (event: any) => {
        log(`📤 [前端] 消息发送事件：${JSON.stringify(event.payload)}`);
      });
      unlistenFns.push(unlistenMessageSent);
      
      // 监听 Peer 连接事件
      const unlistenPeerConnected = await listen('p2p-peer-connected', (event: any) => {
        log(`🔗 [前端] Peer 连接事件：${JSON.stringify(event.payload)}`);
      });
      unlistenFns.push(unlistenPeerConnected);
      
      // 监听 Peer 断开事件
      const unlistenPeerDisconnected = await listen('p2p-peer-disconnected', (event: any) => {
        log(`❌ [前端] Peer 断开事件：${JSON.stringify(event.payload)}`);
      });
      unlistenFns.push(unlistenPeerDisconnected);
      
      // 监听引擎启动事件
      const unlistenEngineStarted = await listen('p2p-engine-started', (event: any) => {
        log(`🚀 [前端] 引擎启动事件：${JSON.stringify(event.payload)}`);
      });
      unlistenFns.push(unlistenEngineStarted);
      
      log('✅ [前端] P2P 事件监听已设置');
      log(`📋 [前端] 已注册 ${unlistenFns.length} 个事件监听器`);
    };
    
    // ⭐ 关键：先设置监听器，再启动应用
    const setupAndInit = async () => {
      await setupEventListeners();
      await initApp();
    };
    
    setupAndInit();
    
    // 清理函数
    return () => {
      log('🧹 [前端] 清理事件监听...');
      unlistenFns.forEach(fn => fn());
    };
  }, []);

  async function handleOnboardingComplete(secret: string, public_: string, name: string) {
    log(`📝 [前端] 创建身份 - 用户：${name}, 密钥：${secret.substring(0, 10)}...`);
    
    setSecretKey(secret);
    setPublicKey(public_);
    setUsername(name);
    
    // 保存到 localStorage
    localStorage.setItem('nebula_identity', JSON.stringify({
      secretKey: secret,
      publicKey: public_,
      username: name,
    }));
    
    // 启动 P2P 引擎
    try {
      log('🚀 [前端] 调用 start_p2p_engine...');
      const pid = await invoke<string>('start_p2p_engine', {
        secretKey: secret,
        name: name,
      });
      log(`✅ [前端] P2P 引擎已启动，Peer ID: ${pid}`);
      setPeerId(pid);
      setInitialized(true);
    } catch (err: any) {
      const errMsg = String(err);
      if (errMsg.includes('already started')) {
        log('ℹ️ [前端] P2P 引擎已启动，使用现有实例');
        setPeerId('已启动');
        setInitialized(true);
      } else {
        log(`❌ [前端] P2P 引擎启动失败：${errMsg}`);
        setError('P2P 引擎启动失败：' + errMsg);
      }
    }
  }

  async function handleLogout() {
    log('🚪 [前端] 用户登出');
    
    // 停止后端 P2P 引擎
    try {
      await invoke('stop_p2p_engine');
      log('✅ [前端] P2P 引擎已停止');
    } catch (err) {
      log(`⚠️ [前端] 停止 P2P 引擎失败：${err}`);
    }
    
    localStorage.removeItem('nebula_identity');
    setInitialized(false);
    setSecretKey('');
    setPublicKey('');
    setUsername('');
    setPeerId('');
    setDebugLogs([]);
  }

  // 显示调试日志（按 L 键或 F12 切换显示）
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L' || e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L'))) {
        e.preventDefault();
        setShowDebugLogs(prev => !prev);
        console.log('🔑 调试窗口切换:', !showDebugLogs);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    console.log('⌨️ 键盘事件监听器已注册');
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      console.log('⌨️ 键盘事件监听器已移除');
    };
  }, []);

  // 暴露全局调试函数到 window
  useEffect(() => {
    (window as any).__testMessage = (content: string) => {
      const testMsg: Message = {
        id: 'test-' + Date.now(),
        conversation_id: 'test-peer',
        sender_id: 'test-peer',
        sender_name: 'Test',
        content: content || '🧪 测试消息 ' + new Date().toLocaleTimeString(),
        message_type: 'text',
        timestamp: Date.now(),
        status: 'received',
      };
      setConversationMessages(prev => {
        const newMap = new Map(prev);
        const msgs = newMap.get('test-peer') || [];
        newMap.set('test-peer', [...msgs, testMsg]);
        return newMap;
      });
      console.log('🧪 测试消息已添加:', testMsg);
      console.log('💡 提示：添加一个 Peer ID 为 "test-peer" 的联系人，或者在控制台运行：');
      console.log('window.__testMessageFor("实际的 Peer ID", "消息内容")');
    };
    
    // 为当前选中的联系人添加测试消息
    (window as any).__testMessageFor = (peerId: string, content: string) => {
      const testMsg: Message = {
        id: 'test-' + Date.now(),
        conversation_id: peerId,
        sender_id: peerId,
        sender_name: 'Test Peer',
        content: content || '🧪 测试消息 ' + new Date().toLocaleTimeString(),
        message_type: 'text',
        timestamp: Date.now(),
        status: 'received',
      };
      setConversationMessages(prev => {
        const newMap = new Map(prev);
        const msgs = newMap.get(peerId) || [];
        newMap.set(peerId, [...msgs, testMsg]);
        return newMap;
      });
      console.log('🧪 测试消息已添加到', peerId, ':', testMsg);
    };
    
    (window as any).__conversationMessages = conversationMessages;
  }, [conversationMessages]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌌</div>
          <div className="text-white text-xl font-medium">启动中...</div>
          <div className="text-gray-400 text-sm mt-2">{debugInfo}</div>
        </div>
      </div>
    );
  }

  // 显示错误
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-white text-xl font-medium mb-4">启动失败</div>
          <div className="text-red-400 bg-red-900 bg-opacity-20 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 未初始化 - 显示 Onboarding
  if (!initialized) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 从公钥生成 Peer ID 显示
  const displayPeerId = peerId && peerId !== '已启动' ? peerId : (publicKey ? `16Uiu2HAm${publicKey.slice(0, 40)}` : '生成中...');

  // 调试信息
  const debugInfo = `身份：${username ? '✅' : '❌'} | P2P: ${initialized ? '✅' : '❌'} | Peer ID: ${displayPeerId ? displayPeerId.substring(0, 20) + '...' : '未知'}`;

  // 已初始化 - 显示聊天界面
  return (
    <div className="relative">
      {/* 顶部调试信息条 */}
      <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-xs px-4 py-2 z-50">
        {debugInfo}
        <span className="ml-4 text-blue-200">按 L 键显示/隐藏调试日志</span>
      </div>
      
      <ChatInterface 
        localPeerId={displayPeerId} 
        localPublicKey={publicKey}
        conversationMessages={conversationMessages}
        setConversationMessages={setConversationMessages}
      />
      
      {/* 用户信息浮层 - 移到左下角 */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-gray-800 bg-opacity-90 backdrop-blur rounded-lg px-4 py-3 border border-gray-700 shadow-lg">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white font-medium text-sm">{username}</div>
              <div className="text-blue-400 text-xs truncate max-w-[200px]" title={displayPeerId}>
                {displayPeerId ? displayPeerId.slice(0, 20) + '...' : '未知'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors ml-2"
              title="退出"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 调试日志窗口 */}
      {showDebugLogs && (
        <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 text-green-400 text-xs p-4 z-50 max-h-64 overflow-y-auto font-mono">
          <div className="flex justify-between items-center mb-2">
            <span>🔍 调试日志 (按 L 键关闭)</span>
            <button 
              onClick={() => setDebugLogs([])}
              className="text-red-400 hover:text-red-300"
            >
              清除
            </button>
          </div>
          {debugLogs.map((log, i) => (
            <div key={i} className="border-b border-gray-800 py-1">{log}</div>
          ))}
          {debugLogs.length === 0 && <div className="text-gray-500">暂无日志</div>}
        </div>
      )}
    </div>
  );
}

export default App;
