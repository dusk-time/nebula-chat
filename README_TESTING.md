# Nebula Chat - P2P 传输实现说明

**更新日期:** 2026-02-23  
**状态:** ✅ API 完成，传输层简化实现

---

## 📡 P2P 传输架构

### 当前实现

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend       │
│   (React)       │         │   (Tauri/Rust)  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  sendChatMessage()        │
         │──────────────────────────>│
         │                           │
         │                           │ ✅ 生成 message_id
         │                           │ ✅ 加入消息队列
         │                           │ ✅ 打印日志
         │                           │ ✅ 发送 P2PEvent::MessageSent
         │                           │
         │  P2PEvent::MessageSent    │
         │<──────────────────────────│
         │                           │
         │  (500ms 延迟模拟)          │
         │                           │
         │  P2PEvent::MessageReceived│
         │<──────────────────────────│ ✅ 模拟对方回复
         │                           │
```

### 消息流程

1. **用户发送消息**
   ```typescript
   const messageId = await sendChatMessage(peerId, "Hello");
   ```

2. **后端处理**
   ```rust
   pub async fn send_chat_message(&mut self, peer_id: &str, content: &str) {
       let message_id = uuid::Uuid::new_v4().to_string();
       
       // 加入消息队列
       self.message_queue.push((peer_id.to_string(), content.to_string()));
       
       // 打印日志
       println!("📤 Message queued for {}: {}", peer_id, content);
       
       // 通知前端
       event_tx.send(P2PEvent::MessageSent { message_id, peer_id });
       
       // 模拟回复（500ms 后）
       tokio::time::sleep(Duration::from_millis(500)).await;
       event_tx.send(P2PEvent::MessageReceived { ... });
   }
   ```

3. **前端接收事件**
   ```typescript
   // 消息已发送
   case 'MessageSent':
       console.log('消息已发送:', event.message_id);
       break;
   
   // 收到回复
   case 'MessageReceived':
       console.log('收到消息:', event.content);
       break;
   ```

---

## 🔧 完整 P2P 实现需要的步骤

### 1. libp2p Request-Response 协议

```rust
// 需要实现的 Codec trait
impl Codec for MyCodec {
    fn write_request<T>(&mut self, io: &mut T, req: Request) -> Future {
        // 1. 序列化为 CBOR
        let data = cbor::encode(&req);
        // 2. 写入长度前缀
        write_length_prefix(io, data.len());
        // 3. 写入数据
        io.write_all(&data)
    }
    
    // read_request, write_response, read_response 同理
}
```

### 2. Swarm 事件循环

```rust
loop {
    match swarm.select_next_some().await {
        // 处理接收到的消息
        SwarmEvent::Behaviour(Event::RequestResponse(
            Message::Request { request, channel, .. }
        )) => {
            // 解析消息
            // 存储到数据库
            // 通知前端
            // 发送 ACK
        }
    }
}
```

### 3. 双实例通信

```
实例 A                          实例 B
  |                               |
  |-- libp2p dial -------------> |
  |                               |
  |-- send_request ------------->|
  |                               |
  |<-- send_response ------------|
  |                               |
```

---

## 📊 当前状态对比

| 功能 | 完整实现 | 当前简化 | 状态 |
|------|----------|----------|------|
| 身份系统 | Ed25519 | Ed25519 | ✅ 100% |
| Peer 管理 | HashMap | HashMap | ✅ 100% |
| 消息 API | ✅ | ✅ | ✅ 100% |
| 事件系统 | ✅ | ✅ | ✅ 100% |
| libp2p 传输 | ✅ | ⚠️ 简化 | ⚠️ 30% |
| 消息队列 | ✅ | ✅ | ✅ 100% |
| 真实网络传输 | ✅ | ❌ 模拟 | ❌ 0% |

---

## 🎯 升级到完整实现的工作量

### 需要修改的文件

1. `src-tauri/src/p2p/mod.rs` - 完整 libp2p 集成
2. `src-tauri/src/commands/p2p.rs` - 添加事件监听命令
3. `src/lib/api.ts` - 添加事件监听 API
4. 前端组件 - 连接真实事件

### 预计时间

- **libp2p Codec 实现:** 2-3 小时
- **Swarm 事件循环:** 1-2 小时
- **前后端事件通信:** 1 小时
- **测试调试:** 2-3 小时

**总计:** 6-9 小时专注开发

---

## ✅ 当前可用的功能

1. **创建身份** - Ed25519 密钥对生成
2. **添加联系人** - 手动添加 Peer
3. **发送消息** - API 完整，消息入队
4. **消息队列** - 可查看已发送但未传输的消息
5. **事件系统** - P2PEvent 通知前端
6. **独立会话** - 每个联系人独立消息记录

---

## 📝 测试方法

### 1. 查看消息队列

```rust
// 在 Rust 后端
println!("Message queue: {:?}", engine.get_message_queue());
```

### 2. 前端控制台

打开浏览器开发者工具，查看：
- 消息发送事件
- 消息接收事件
- Peer 发现事件

### 3. 日志输出

后端会打印：
```
✅ P2P engine started
   Peer ID: 16Uiu2HAm...
   Public Key: CAES...
📤 Message queued for 16Uiu2HAm...: Hello
   Message ID: 550e8400-e29b-41d4-a716-446655440000
   Queue size: 1
```

---

## 🚀 下一步

### 立即可做
1. **测试当前功能** - 添加联系人，发送消息
2. **查看消息队列** - 确认消息正确入队
3. **检查事件流** - 前端接收 P2PEvent

### 短期目标
1. **完整 libp2p 集成** - 实现真实网络传输
2. **双实例测试** - 两个客户端互相通信
3. **消息持久化** - 存储到 SQLite

---

**文档生成时间:** 2026-02-23 21:25 GMT+8  
**版本:** v0.1.0-alpha

🌌 **Nebula Chat - P2P Messaging Foundation**
