# Nebula Chat - P2P 真实网络传输实现指南

**版本:** v0.1.0-alpha  
**日期:** 2026-02-23  
**状态:** ✅ 基础完成，🚧 完整网络传输需额外开发

---

## 🎯 当前实现状态

### ✅ 已完成

1. **Ed25519 身份系统** - 完整的密钥对生成和管理
2. **Peer 管理** - 添加、查询、状态跟踪
3. **消息 API** - `send_chat_message()` 完整实现
4. **事件系统** - P2PEvent 实时通知前端
5. **消息日志** - 记录所有发送/接收的消息
6. **mDNS 发现** - 代码就绪（libp2p 集成后可用）

### 🚧 网络传输状态

**当前实现:**
- ✅ 消息正确入队并记录
- ✅ 事件通知前端
- ⚠️ 网络传输简化（模拟回复）
- ⚠️ libp2p 完整集成需额外 6-9 小时

---

## 📡 P2P 架构说明

### 当前工作流程

```
用户 (前端)
   │
   │ sendChatMessage(peerId, "Hello")
   ▼
Tauri 命令层
   │
   ▼
P2PEngine.send_chat_message()
   │
   ├─→ 生成 message_id
   ├─→ 记录到 message_log
   ├─→ 打印日志
   ├─→ 发送 P2PEvent::MessageSent
   │
   └─→ [300ms 延迟]
       │
       └─→ 发送 P2PEvent::MessageReceived (模拟回复)
```

### 完整网络传输需要的工作

```
实例 A                              实例 B
  │                                   │
  │ libp2p swarm start                │ libp2p swarm start
  │ listen on 0.0.0.0:0               │ listen on 0.0.0.0:0
  │                                   │
  │◄────── mDNS discover ────────────►│
  │   "Found peer at 192.168.1.100"   │
  │                                   │
  │ dial(peer_B)                      │
  │──────────────────────────────────►│
  │                                   │
  │ send_request(Message)             │
  │──────────────────────────────────►│
  │                                   │ receive_request
  │                                   │ process message
  │                                   │ emit event to frontend
  │                                   │
  │◄──────────────────────────────────│
  │          send_response(Ack)       │
  │                                   │
  │ receive_response                  │
  │ emit MessageSent event            │
  │                                   │
```

---

## 🔧 升级到完整 libp2p 实现

### 需要的修改

#### 1. 完整的 libp2p Swarm 集成

```rust
// src-tauri/src/p2p/mod.rs

use libp2p::{
    identity,
    mdns::tokio::Behaviour as Mdns,
    request_response::{self, ProtocolSupport},
    swarm::{SwarmEvent, NetworkBehaviour},
    tcp::tokio::Transport,
    PeerId, Swarm,
};

#[derive(NetworkBehaviour)]
struct NebulaBehaviour {
    mdns: Mdns,
    request_response: request_response::Behaviour<cbor::Codec>,
}

pub struct P2PEngine {
    swarm: Swarm<NebulaBehaviour>,
    // ... 其他字段
}

impl P2PEngine {
    pub async fn poll_events(&mut self) {
        loop {
            match self.swarm.select_next_some().await {
                SwarmEvent::Behaviour(Event::RequestResponse(...)) => {
                    // 处理接收到的消息
                }
                SwarmEvent::Behaviour(Event::Mdns(MdnsEvent::Discovered(list))) => {
                    // 处理发现的 peer
                }
                _ => {}
            }
        }
    }
}
```

#### 2. 前后端事件通信

```rust
// src-tauri/src/commands/p2p.rs

#[tauri::command]
pub async fn listen_for_messages(
    state: State<'_, P2PState>,
    window: Window
) -> Result<(), String> {
    // 创建事件通道
    let (tx, mut rx) = tokio::sync::mpsc::channel(100);
    
    // 设置到 P2P engine
    state.engine.lock().await.set_event_sender(tx);
    
    // 监听并转发到前端
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            let _ = window.emit("p2p-event", event);
        }
    });
    
    Ok(())
}
```

#### 3. 前端事件监听

```typescript
// src/lib/api.ts

import { listen } from '@tauri-apps/api/event';

export async function startP2PListener(
  callback: (event: P2PEvent) => void
) {
  await listen('p2p-event', (event: any) => {
    callback(event.payload as P2PEvent);
  });
}

// src/App.tsx
useEffect(() => {
  startP2PListener((event) => {
    switch (event.type) {
      case 'MessageReceived':
        // 添加接收到的消息
        break;
      case 'MessageSent':
        // 更新消息状态
        break;
    }
  });
}, []);
```

---

## 📊 完整实现工作量估算

| 任务 | 预计时间 | 难度 |
|------|----------|------|
| libp2p Codec 实现 | 2-3 小时 | ⭐⭐⭐⭐ |
| Swarm 事件循环 | 1-2 小时 | ⭐⭐⭐ |
| 前后端事件通信 | 1 小时 | ⭐⭐ |
| 双实例测试 | 2-3 小时 | ⭐⭐⭐ |
| 调试和优化 | 2-3 小时 | ⭐⭐⭐⭐ |
| **总计** | **8-12 小时** | - |

---

## 🧪 当前版本测试方法

### 1. 查看 Peer ID

启动应用后，控制台会显示：
```
✅ P2P Engine initialized
   Peer ID: 16Uiu2HAmTestPeer123abc
   Public Key: CAESAK...
```

### 2. 添加联系人

在聊天界面：
1. 点击"🧪 测试"添加测试联系人
2. 或手动输入 Peer ID 添加

### 3. 发送消息

1. 选择联系人
2. 输入消息
3. 点击发送
4. 查看控制台日志

### 4. 查看消息日志

```rust
// 在 Rust 后端
println!("Message log: {:?}", engine.get_message_log());
```

### 5. 前端控制台

打开浏览器开发者工具 (F12)，查看：
- 消息发送事件
- 消息接收事件
- Peer 发现事件

---

## 📝 示例日志输出

```
✅ P2P Engine initialized
   Peer ID: 16Uiu2HAmTestPeer123abc
   Public Key: CAESAK...
   
🚀 P2P engine started
   Ready for network communication

✅ Peer added: 16Uiu2HAmPeer2 at 192.168.1.100

📤 Message to 16Uiu2HAmPeer2: Hello!
   Message ID: 550e8400-e29b-41d4-a716-446655440000
   Total messages logged: 1
```

---

## 🎯 下一步行动

### 立即可用
- ✅ 创建身份
- ✅ 添加联系人
- ✅ 发送消息（记录日志）
- ✅ 查看消息历史
- ✅ 独立会话管理

### 短期目标（8-12 小时开发）
- ⬜ 完整 libp2p 集成
- ⬜ 真实网络传输
- ⬜ 双实例通信测试
- ⬜ mDNS 自动发现

### 长期目标
- ⬜ 文件传输
- ⬜ 群组聊天
- ⬜ 离线消息队列
- ⬜ 端到端加密

---

## 📚 相关文档

- `PROJECT_STATUS.md` - 项目完成度报告
- `README_TESTING.md` - 测试指南
- `DEV_PROGRESS.md` - 开发日志
- `ARCHIVE_2026-02-23.md` - 项目存档

---

**文档生成时间:** 2026-02-23 22:00 GMT+8  
**版本:** v0.1.0-alpha

🌌 **Nebula Chat - P2P Messaging Foundation Complete**
