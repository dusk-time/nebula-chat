# Nebula Chat P2P 问题修复总结

**日期:** 2026-02-25  
**问题:** 后端收到消息但前端不显示 + 端口冲突

---

## 🔍 问题分析

### 问题 1: 前端收到事件但不显示消息 ❌

**根本原因:**
- `App.tsx` 中设置了事件监听 `listen('p2p-message-received', ...)`
- 但只是打印日志，**没有更新 React 状态**
- `ChatInterface.tsx` 维护的 `conversationMessages` 状态永远不会被更新

**日志证据:**
```javascript
// App.tsx - 只打印日志，没有更新状态
listen('p2p-message-received', (event: any) => {
  log(`📬 [前端] 收到消息事件：${JSON.stringify(event.payload)}`);
  console.log('💬 收到消息:', event.payload);
  // ❌ 缺少：setConversationMessages(...)
});
```

### 问题 2: 端口冲突 (AddrInUse - 10048) ❌

**根本原因:**
- 在同一台机器上运行了两个实例
- 两个实例使用了**相同的 Peer ID**（相同的 Ed25519 密钥）
- libp2p 不允许同一个 Peer ID 在同一个网络上监听

**错误日志:**
```
code: 10048, kind: AddrInUse
通常每个套接字地址 (协议/网络地址/端口) 只允许使用一次

code: 10061, kind: ConnectionRefused
由于目标计算机积极拒绝，无法连接
```

---

## ✅ 修复方案

### 修复 1: 前端消息状态管理

**修改文件:** `F:\nebula-chat\src\App.tsx`

**改动:**
1. 在 `App.tsx` 中添加全局消息状态：
```typescript
const [conversationMessages, setConversationMessages] = useState<Map<string, Message[]>>(new Map());
```

2. 更新事件监听器，收到消息时更新状态：
```typescript
const unlistenMessageReceived = await listen('p2p-message-received', (event: any) => {
  const payload = event.payload;
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
  
  setConversationMessages(prev => {
    const newMap = new Map(prev);
    const currentMessages = newMap.get(payload.from_peer_id) || [];
    newMap.set(payload.from_peer_id, [...currentMessages, newMessage]);
    return newMap;
  });
});
```

3. 将状态传递给 `ChatInterface` 组件：
```typescript
<ChatInterface 
  localPeerId={displayPeerId} 
  localPublicKey={publicKey}
  conversationMessages={conversationMessages}
  setConversationMessages={setConversationMessages}
/>
```

**修改文件:** `F:\nebula-chat\src\components\ChatInterface.tsx`

**改动:**
- 移除本地 `conversationMessages` 状态
- 从 props 接收状态和更新函数

**修改文件:** `F:\nebula-chat\src\lib\types.ts`

**改动:**
- 添加 `'received'` 到 Message 的 status 类型

### 修复 2: 双实例运行配置

**创建文档:** `F:\nebula-chat\RUN_TWO_INSTANCES.md`

**关键步骤:**
1. **每个实例必须使用不同的身份**（不同的 Ed25519 密钥对）
2. 使用不同浏览器或隐私模式运行第二个实例
3. 或者修改 Tauri 的 `identifier` 运行两个桌面应用实例

**测试流程:**
```bash
# 实例 A
cd F:\nebula-chat
npm run dev
# 创建身份 Alice，复制 Peer ID

# 实例 B（新浏览器窗口/隐私模式）
# 访问 http://localhost:5173
# 创建身份 Bob，复制 Peer ID

# 互相添加对方 Peer ID 为联系人
# 发送测试消息
```

---

## 📊 数据流说明

### 修复前：
```
后端收到消息
  ↓
通过 Tauri emit 发送事件：p2p-message-received
  ↓
前端监听到事件
  ↓
打印日志 ❌
  ↓
【结束】消息不显示
```

### 修复后：
```
后端收到消息
  ↓
通过 Tauri emit 发送事件：p2p-message-received
  ↓
前端监听到事件
  ↓
创建 Message 对象
  ↓
更新 conversationMessages 状态 ✅
  ↓
React 重新渲染 ChatInterface
  ↓
消息显示在聊天界面 ✅
```

---

## 🧪 测试清单

### 基础测试
- [ ] 启动实例 A（Alice）
- [ ] 启动实例 B（Bob）- 使用不同浏览器/隐私模式
- [ ] 互相添加对方 Peer ID
- [ ] 实例 A 发送消息 "Hello" → 实例 B 显示
- [ ] 实例 B 发送消息 "Hi" → 实例 A 显示

### 进阶测试
- [ ] 发送多条消息，检查顺序
- [ ] 刷新页面，检查消息是否保留（需要实现持久化）
- [ ] 断开一个实例，检查连接状态显示
- [ ] 重新连接，检查消息是否继续发送

### 压力测试
- [ ] 快速发送大量消息
- [ ] 同时运行 3+ 个实例
- [ ] 网络断开后重连

---

## 📝 后续改进建议

### 1. 消息持久化
当前消息只保存在内存中，刷新页面会丢失。

**建议:** 使用 SQLite 或 IndexedDB
```rust
// 后端：保存到 SQLite
db::save_message(&MessageLogEntry { ... })?;

// 前端：使用 IndexedDB
const db = await openDB('nebula-chat', 1);
```

### 2. 联系人管理
当前联系人只保存在前端状态中。

**建议:** 保存到后端数据库
```rust
#[derive(Serialize, Deserialize)]
pub struct Contact {
    peer_id: String,
    public_key: String,
    name: String,
    added_at: i64,
}
```

### 3. 消息加密
当前消息是明文传输。

**建议:** 使用 Noise 协议 + 应用层加密
```rust
// 使用双方的公钥派生共享密钥
let shared_key = derive_shared_key(local_private, remote_public);
let encrypted = encrypt(&shared_key, &message);
```

### 4. 离线消息
当前消息只在对方在线时发送。

**建议:** 实现 DHT 存储或中继节点
```rust
// 使用 libp2p-kad 实现 DHT
let kademlia = Kademlia::new(local_peer_id, store);
```

---

## 🎯 成功标志

当你看到以下日志时，说明一切正常：

**实例 A 后端:**
```
📡 [P2P] 监听地址：/ip4/127.0.0.1/tcp/55860
✅ Connected to peer: 12D3KooWPVYd6e2h...
📥 Received message from 12D3KooWPVYd6e2h...: Hello!
✅ Message acknowledged: uuid-here
```

**实例 A 前端:**
```
🔍 [前端] 应用启动，检查保存的身份...
🔑 [前端] 找到保存的身份 - 用户：Alice
✅ [前端] P2P 引擎已启动，Peer ID: 12D3KooWFADepPN4...
📡 [前端] 设置 P2P 事件监听...
✅ [前端] P2P 事件监听已设置
📬 [前端] 收到消息事件：{"from_peer_id":"12D3KooWPVYd6e2h...","content":"Hello!"}
✅ [前端] 消息已添加到对话：12D3KooWPVYd6e2h...
```

**实例 A UI:**
- 联系人列表显示 Bob（绿色在线状态）
- 聊天界面显示收到的消息 "Hello!"
- 消息气泡在左侧（对方发送）

---

## 📚 相关文档

- `RUN_TWO_INSTANCES.md` - 如何运行两个实例进行测试
- `src-tauri/src/p2p/mod.rs` - P2P 引擎实现
- `src-tauri/src/commands/p2p.rs` - Tauri 命令实现
- `src/App.tsx` - 前端主组件（事件监听）
- `src/components/ChatInterface.tsx` - 聊天界面

---

**修复完成时间:** 2026-02-25 09:00  
**编译状态:** ✅ 通过  
**待测试:** 双实例 P2P 通信
