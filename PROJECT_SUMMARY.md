# Nebula Chat 项目总结文档

**创建时间:** 2026-02-25  
**最后更新:** 2026-02-25 18:00  
**状态:** P2P 消息传递核心功能已完成 ✅

---

## 📋 项目概述

Nebula Chat 是一个基于 **libp2p** 的 **去中心化 P2P 即时通讯应用**，使用 **Tauri** 框架构建，支持端到端加密通信。

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React + TypeScript | 用户界面 |
| **后端** | Rust + Tauri | 桌面应用框架 |
| **P2P** | libp2p | 去中心化网络协议 |
| **身份** | Ed25519 | 非对称加密身份系统 |
| **传输** | TCP + Noise + Yamux | 安全传输层 |
| **协议** | Request-Response (CBOR) | 消息协议 |
| **发现** | mDNS | 局域网自动发现 |

---

## ✅ 已完成的功能

### 1. 身份系统

- ✅ **Ed25519 密钥对生成**
- ✅ **Peer ID 派生**（从公钥）
- ✅ **密钥本地存储**（localStorage）
- ✅ **身份持久化**（刷新后保留）

**实现文件:**
- `src-tauri/src/crypto/mod.rs` - 加密模块
- `src/components/Onboarding.tsx` - 身份创建界面

---

### 2. P2P 网络引擎

- ✅ **libp2p Swarm 集成**
- ✅ **mDNS 自动发现**（局域网）
- ✅ **TCP 传输**（支持 IPv4/IPv6）
- ✅ **Noise 协议加密**
- ✅ **Yamux 多路复用**
- ✅ **Request-Response 协议**（CBOR 编码）
- ✅ **后台事件轮询**

**实现文件:**
- `src-tauri/src/p2p/mod.rs` - P2P 引擎核心

**关键代码:**
```rust
// NetworkBehaviour 实现
#[derive(NetworkBehaviour)]
struct NebulaBehaviour {
    mdns: Mdns,
    request_response: request_response::cbor::Behaviour<Request, Response>,
}

// 创建身份
let keypair = identity::Keypair::ed25519_from_bytes(seed_bytes)?;
let local_peer_id = PeerId::from(keypair.public());

// 启动监听
swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse().unwrap())?;
```

---

### 3. 消息系统

- ✅ **P2P 消息发送**
- ✅ **P2P 消息接收**
- ✅ **消息确认机制**（ACK）
- ✅ **消息 ID 去重**
- ✅ **消息实时推送**（Tauri 事件）
- ✅ **前端消息显示**
- ✅ **消息状态管理**（React State）

**实现文件:**
- `src-tauri/src/commands/p2p.rs` - P2P 命令
- `src-tauri/src/p2p/mod.rs` - 消息处理
- `src/App.tsx` - 事件监听
- `src/components/ChatInterface.tsx` - 聊天界面

**消息流程:**
```
实例 B 发送消息
  ↓
📤 send_chat_message(peer_id, content)
  ↓
libp2p Request-Response 协议
  ↓
实例 A 后端接收
  ↓
📥 Received message from Peer ID
  ↓
📬 Tauri emit("p2p-message-received")
  ↓
实例 A 前端监听
  ↓
setConversationMessages(...)
  ↓
React 重新渲染
  ↓
消息显示在聊天界面 ✅
```

---

### 4. 用户界面

- ✅ **身份创建界面**（Onboarding）
- ✅ **聊天界面**（ChatInterface）
- ✅ **联系人管理**（添加/删除）
- ✅ **消息列表显示**
- ✅ **发送消息输入框**
- ✅ **Peer ID 查看/复制**
- ✅ **调试面板**（连接状态）
- ✅ **调试日志窗口**（按 L 键）

**实现文件:**
- `src/App.tsx` - 主应用
- `src/components/Onboarding.tsx` - 身份创建
- `src/components/ChatInterface.tsx` - 聊天界面

---

### 5. 前后端通信

- ✅ **Tauri Commands**（invoke）
- ✅ **Tauri Events**（listen/emit）
- ✅ **权限配置**（capabilities）
- ✅ **事件监听器管理**（清理）
- ✅ **app_handle 克隆**（在 spawn 中使用）

**关键配置:**
```json
// src-tauri/capabilities/main.json
{
  "permissions": [
    "core:default",
    "core:event:allow-listen",
    "core:event:allow-emit"
  ]
}
```

---

## 🔧 已解决的问题

### 问题 1: 前端收不到消息事件

**现象:** 后端显示 `✅ 事件发送成功`，但前端没收到

**原因:** Tauri 2.x 权限系统限制，`event.listen` 需要显式授权

**解决:** 添加 `capabilities/main.json` 配置：
```json
{
  "permissions": [
    "core:event:allow-listen",
    "core:event:allow-emit"
  ]
}
```

---

### 问题 2: 消息重复显示

**现象:** 发送一条消息，接收方显示两条

**原因:** React 18 Strict Mode 在开发模式下会执行两次回调

**解决:** 添加消息去重逻辑：
```typescript
const exists = currentMessages.some(msg => msg.id === payload.message_id);
if (exists) {
  console.log('⚠️ 消息已存在，跳过添加');
  return newMap;
}
```

---

### 问题 3: 事件监听器设置时机

**现象:** 错过早期事件（如 EngineStarted）

**原因:** `initApp()` 和 `setupEventListeners()` 并行调用

**解决:** 改为顺序调用：
```typescript
const setupAndInit = async () => {
  await setupEventListeners();  // 先设置监听器
  await initApp();              // 再启动引擎
};
```

---

### 问题 4: app_handle 在 spawn 中不可用

**现象:** 编译错误，`app_handle` 被 move

**原因:** `tauri::async_runtime::spawn` 需要 `'static` 生命周期

**解决:** 克隆 app_handle：
```rust
let app_handle_clone = app_handle.clone();
tauri::async_runtime::spawn(async move {
  // 使用 app_handle_clone
});
```

---

### 问题 5: 端口冲突（双实例测试）

**现象:** `code: 10048, kind: AddrInUse`

**原因:** 两个实例使用相同的 Peer ID（相同身份）

**解决:** 
1. 使用不同的用户名创建身份
2. 或者修改 `tauri.conf.json` 的 `identifier`

---

## 📊 测试结果

### 双实例 P2P 通信测试

**测试环境:**
- Windows 10
- 同一局域网（192.168.31.x）
- 两个 Tauri 实例

**测试步骤:**
1. 启动实例 A（Alice）
2. 启动实例 B（Bob）
3. 互相添加对方 Peer ID
4. 实例 A 发送消息 "1"
5. 检查实例 B 是否收到

**测试结果:**

| 检查项 | 结果 | 日志证据 |
|--------|------|----------|
| P2P 连接建立 | ✅ | `✅ Connected to peer: 12D3KooW...` |
| 消息发送 | ✅ | `📤 Sending message to 12D3KooW...: 1` |
| 消息接收（后端） | ✅ | `📥 Received message from 12D3KooW...: 1` |
| 后端事件推送 | ✅ | `📬 [后端] 转发收到消息事件到前端` + `✅ [后端] 事件发送成功` |
| 前端事件监听 | ✅ | `📬 [前端] 收到消息事件！` |
| 消息显示 | ✅ | `🔍 [调试] 该联系人的消息数：1` |
| 消息去重 | ✅ | `⚠️ 消息已存在，跳过添加` |

**结论:** P2P 消息传递核心功能**完全正常** ✅

---

## 📁 项目结构

```
F:\nebula-chat\
├── src/                          # 前端代码
│   ├── App.tsx                   # 主应用组件
│   ├── main.tsx                  # 入口文件
│   ├── components/
│   │   ├── Onboarding.tsx        # 身份创建界面
│   │   ├── ChatInterface.tsx     # 聊天界面
│   │   └── ChatLayout.tsx        # 布局组件
│   └── lib/
│       ├── types.ts              # TypeScript 类型
│       ├── api.ts                # API 封装
│       └── utils.ts              # 工具函数
│
├── src-tauri/                    # 后端代码
│   ├── src/
│   │   ├── main.rs               # Tauri 应用入口
│   │   ├── commands/
│   │   │   ├── p2p.rs            # P2P 命令
│   │   │   ├── chat.rs           # 聊天命令
│   │   │   ├── contacts.rs       # 联系人命令
│   │   │   ├── crypto.rs         # 加密命令
│   │   │   └── mod.rs            # 命令模块
│   │   ├── p2p/
│   │   │   └── mod.rs            # P2P 引擎核心
│   │   ├── crypto/
│   │   │   └── mod.rs            # 加密模块
│   │   ├── db/
│   │   │   └── mod.rs            # 数据库模块（SQLite）
│   │   └── config/
│   │       └── mod.rs            # 配置模块
│   ├── capabilities/
│   │   └── main.json             # Tauri 权限配置
│   ├── tauri.conf.json           # Tauri 配置
│   └── Cargo.toml                # Rust 依赖
│
├── package.json                  # 前端依赖
├── vite.config.ts                # Vite 配置
└── README.md                     # 项目说明
```

---

## 🚧 待完成的功能

### 高优先级

1. **消息持久化** ⭐⭐⭐
   - 使用 SQLite 存储消息
   - 启动时加载历史消息
   - 防止刷新丢失

2. **联系人持久化** ⭐⭐⭐
   - 保存联系人列表到 SQLite
   - 启动时自动加载

3. **离线消息** ⭐⭐
   - 支持离线发送
   - 使用 DHT 存储或中继节点

### 中优先级

4. **端到端加密** ⭐⭐
   - 应用层消息加密
   - 使用双方公钥派生共享密钥

5. **文件/图片传输** ⭐⭐
   - 扩展消息类型
   - 使用 libp2p 文件传输协议

6. **群组聊天** ⭐
   - 使用 libp2p gossipsub
   - 多人群聊支持

### 低优先级

7. **消息搜索** ⭐
   - 本地消息搜索
   - 按时间/联系人过滤

8. **主题/表情** ⭐
   - UI 美化
   - 表情符号支持

9. **移动端支持** ⭐
   - React Native 版本
   - iOS/Android 支持

---

## 📝 关键代码片段

### 1. P2P 消息发送

```rust
// src-tauri/src/commands/p2p.rs
#[tauri::command]
pub async fn send_chat_message(
    state: State<'_, P2PState>,
    peer_id: String,
    content: String,
) -> Result<String, String> {
    let mut engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_mut() {
        engine.send_chat_message(&peer_id, &content).await
    } else {
        Err("P2P engine not started".to_string())
    }
}
```

### 2. 前端事件监听

```typescript
// src/App.tsx
const unlistenMessageReceived = await listen('p2p-message-received', (event: any) => {
  const payload = event.payload;
  const newMessage: Message = {
    id: payload.message_id,
    conversation_id: payload.from_peer_id,
    sender_id: payload.from_peer_id,
    sender_name: payload.from_name,
    content: payload.content,
    message_type: 'text',
    timestamp: payload.timestamp * 1000,
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

### 3. libp2p 消息接收

```rust
// src-tauri/src/p2p/mod.rs
BehaviourEvent::RequestResponse(rr_event) => {
  match rr_event {
    request_response::Event::Message { peer: _, message } => {
      match message {
        request_response::Message::Request { request, channel, .. } => {
          match request {
            Request::ChatMessage(msg) => {
              // 记录消息
              self.message_log.push(MessageLogEntry { ... });
              
              // 发送 ACK
              let response = Response::Ack { message_id: msg.message_id };
              let _ = self.swarm.behaviour_mut().request_response.send_response(channel, response);
              
              // 推送到前端
              if let Some(tx) = &self.event_tx {
                let _ = tx.send(P2PEvent::MessageReceived { ... });
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 🎯 项目里程碑

| 日期 | 里程碑 | 状态 |
|------|--------|------|
| 2026-02-24 | 项目启动 | ✅ 完成 |
| 2026-02-24 04:05 | P2P 引擎基础框架 | ✅ 完成 |
| 2026-02-24 08:30 | libp2p Swarm 集成 | ✅ 完成 |
| 2026-02-25 08:30 | 前后端通信系统 | ✅ 完成 |
| 2026-02-25 17:35 | P2P 消息传递验证 | ✅ 完成 |
| 2026-02-25 18:00 | 项目总结 | ✅ 完成 |
| TBD | 消息持久化（SQLite） | 📋 待办 |
| TBD | 端到端加密 | 📋 待办 |
| TBD | 文件传输 | 📋 待办 |

---

## 📚 参考文档

### 官方文档
- [Tauri 文档](https://tauri.app/)
- [libp2p 文档](https://docs.libp2p.io/)
- [React 文档](https://react.dev/)

### 项目文档
- `RUN_TWO_INSTANCES.md` - 双实例测试指南
- `DEBUG_GUIDE.md` - 调试指南
- `QUICK_TEST.md` - 快速测试指南
- `FIX_SUMMARY.md` - 修复总结

---

## 👥 贡献者

- **开发:** Nebula Chat Team
- **P2P 架构:** libp2p Rust 实现
- **UI 设计:** 自定义设计

---

## 📄 许可证

MIT License

---

## 🎉 总结

**Nebula Chat P2P 消息传递核心功能已完成！**

- ✅ 身份系统
- ✅ P2P 网络引擎
- ✅ 消息发送/接收
- ✅ 前后端通信
- ✅ 用户界面

**下一步:** 实现消息持久化（SQLite），让消息在刷新后不丢失。

---

**最后更新:** 2026-02-25 18:00  
**文档版本:** v1.0
