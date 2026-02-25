# 🔍 前后端通信调试指南

## 问题：后端收到消息但前端不显示

### 🎯 调试步骤

## 第一步：检查后端是否真的收到消息

启动应用后，在**后端终端**查看日志，应该看到：

```
🔑 [后端] start_p2p_engine 被调用
✅ [后端] P2P 引擎创建成功，Peer ID: 12D3KooW...
🔄 [后端] 启动后台事件轮询任务...
📡 [后端] 事件转发任务已启动
```

**发送测试消息后**，接收方后端应该看到：

```
📥 Received message from 12D3KooW...: 测试内容
📬 [后端] 转发收到消息事件到前端 from=12D3KooW...
✅ [后端] 事件发送成功
```

### ❌ 如果没看到这些日志

**问题在后端 P2P 引擎**，检查：
1. 两个实例的 Peer ID 是否不同
2. 是否建立了连接（看有没有 `✅ Connected to peer`）
3. 消息是否真的发送到了后端

---

## 第二步：检查前端是否收到事件

在**前端浏览器控制台**（F12）查看：

```
📡 [前端] 设置 P2P 事件监听...
✅ [前端] P2P 事件监听已设置
📋 [前端] 已注册 6 个事件监听器
```

**收到消息时应该看到：**

```
📬 [前端] 收到消息事件：{"from_peer_id":"...","content":"..."}
✅ [前端] 消息已添加到对话：...
```

### ❌ 如果没看到 "收到消息事件"

**问题在事件监听**，可能原因：
1. 事件名称不匹配（后端 emit 的和前端 listen 的不一样）
2. 监听器设置时机不对（在事件发出之后才设置）
3. Tauri 事件系统问题

---

## 第三步：检查消息是否显示

按 **L 键** 打开调试日志窗口，查看：
- 有没有收到消息的日志
- conversationMessages 是否更新

点击 **🐛 调试** 按钮：
- 查看已连接的 Peer 列表
- 点击 **🧪 测试消息** 按钮

### ✅ 如果测试消息能显示

说明**前端状态管理没问题**，问题在**后端事件推送**

### ❌ 如果测试消息也不能显示

说明**前端状态管理有问题**，检查 ChatInterface 的 props 传递

---

## 第四步：检查连接状态

在调试面板中查看：
- 已连接 Peer 数：应该是 1（如果有一个联系人）
- 如果有连接，会显示 Peer ID

### ❌ 如果连接数为 0

**P2P 连接没建立**，检查：
1. 两个实例是否使用不同身份
2. 是否手动添加了对方 Peer ID
3. 防火墙是否阻止连接

---

## 🐛 常见问题排查

### 问题 1: 事件名称不匹配

**检查后端 emit 的名称：**
```rust
app_handle.emit("p2p-message-received", ...)
```

**检查前端 listen 的名称：**
```typescript
listen('p2p-message-received', ...)
```

**必须完全一致！**

---

### 问题 2: app_handle 没有正确传递

在 `src-tauri/src/commands/p2p.rs` 中：

```rust
// ✅ 正确 - 克隆 app_handle
let app_handle_clone = app_handle.clone();
tauri::async_runtime::spawn(async move {
    // 使用 app_handle_clone
});
```

```rust
// ❌ 错误 - 直接使用 app_handle（会被 move）
tauri::async_runtime::spawn(async move {
    // app_handle 已经不可用了
});
```

---

### 问题 3: 监听器设置太晚

**错误时机：**
```typescript
// 先启动引擎
await invoke('start_p2p_engine', ...);

// 后设置监听器
setupEventListeners();
```

**正确时机：**
```typescript
// 先设置监听器
setupEventListeners();

// 后启动引擎
await invoke('start_p2p_engine', ...);
```

---

### 问题 4: conversationMessages 没有正确传递

**检查 App.tsx：**
```typescript
<ChatInterface 
  conversationMessages={conversationMessages}
  setConversationMessages={setConversationMessages}
/>
```

**检查 ChatInterface.tsx：**
```typescript
export function ChatInterface({ 
  conversationMessages,
  setConversationMessages 
}: ChatInterfaceProps)
```

---

## 📝 快速测试脚本

在浏览器控制台中运行：

```javascript
// 1. 检查是否有 conversationMessages 状态
console.log('当前消息状态:', window.__conversationMessages);

// 2. 手动触发事件（模拟后端发送）
window.__TAURI__.event.emit('p2p-message-received', {
  from_peer_id: 'test-peer',
  from_name: 'Test',
  content: '手动测试消息',
  timestamp: Date.now() / 1000,
  message_id: 'manual-' + Date.now()
});

// 3. 检查消息是否添加
setTimeout(() => {
  console.log('消息状态更新后:', window.__conversationMessages);
}, 100);
```

---

## 🎯 最可能的问题

根据经验，最可能的问题是：

### 1. app_handle 在 spawn 中不可用 ⭐⭐⭐

检查 `src-tauri/src/commands/p2p.rs` 第 50-60 行：

```rust
let app_handle_clone = app_handle.clone();  // ← 这行有吗？

tauri::async_runtime::spawn(async move {
    tauri::async_runtime::spawn(async move {
        // 这里用的是 app_handle_clone 吗？
    });
});
```

### 2. 事件监听器在错误的地方设置 ⭐⭐

检查 `src/App.tsx`：

```typescript
// 监听器应该在 useEffect 中设置一次
useEffect(() => {
  setupEventListeners();  // ← 只调用一次
}, []);  // ← 空依赖数组
```

### 3. conversationMessages 状态没有正确共享 ⭐

检查 `ChatInterface.tsx` 是否真的使用了 props 中的状态：

```typescript
// 不应该有自己的 conversationMessages 状态
// const [conversationMessages, setConversationMessages] = ... ← 这行应该删除

// 应该使用 props
const { conversationMessages, setConversationMessages } = props;
```

---

## 🚀 立即测试

1. **启动应用**
2. **按 L 键** 打开调试日志
3. **点击 🐛 调试** 按钮
4. **点击 🧪 测试消息** 按钮

**如果测试消息能显示** → 前端没问题，问题在后端事件推送

**如果测试消息也不能显示** → 前端状态管理有问题

---

## 📞 需要提供的信息

如果还是不行，请提供：

1. **后端终端日志**（从启动到发送消息的完整日志）
2. **前端控制台日志**（F12 打开）
3. **调试日志**（按 L 键查看）
4. **调试面板截图**（点击 🐛 调试）

这样我可以精确定位问题！
