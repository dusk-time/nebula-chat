# Nebula Chat - 双实例 P2P 通信测试指南

**版本:** v0.1.0-alpha  
**日期:** 2026-02-24  
**状态:** ✅ 完整 libp2p 集成完成

---

## 🎯 测试目标

验证两个 Nebula Chat 实例之间的真实 P2P 通信：
- ✅ mDNS 自动发现（同一局域网）
- ✅ 手动添加 Peer
- ✅ 发送/接收消息
- ✅ 连接状态管理

---

## 📋 前置条件

1. **编译通过**
   ```bash
   cd F:\nebula-chat\src-tauri
   cargo check
   ```

2. **安装依赖**
   ```bash
   cd F:\nebula-chat
   npm install
   ```

---

## 🚀 测试步骤

### 方法 A: 开发模式（推荐）

#### 1. 启动第一个实例

```bash
cd F:\nebula-chat
npm run tauri dev
```

**记录 Peer ID:**
```
✅ P2P Engine initialized with FULL libp2p integration
   Peer ID: 16Uiu2HAmABC123...
   Public Key: CAESAK...
   Name: User1
   Ready for REAL P2P communication!
```

#### 2. 启动第二个实例

打开**新的终端窗口**：

```bash
cd F:\nebula-chat
npm run tauri dev
```

**记录 Peer ID:**
```
✅ P2P Engine initialized with FULL libp2p integration
   Peer ID: 16Uiu2HAmXYZ789...
   Public Key: CAESAX...
   Name: User2
   Ready for REAL P2P communication!
```

#### 3. 添加联系人

**在实例 1 中:**
1. 打开应用
2. 点击"添加联系人"或"🧪 测试"
3. 输入实例 2 的 Peer ID: `16Uiu2HAmXYZ789...`
4. 点击添加

**在实例 2 中:**
1. 打开应用
2. 添加实例 1 的 Peer ID: `16Uiu2HAmABC123...`

#### 4. 发送测试消息

**实例 1 → 实例 2:**
1. 选择实例 2 的联系人
2. 输入消息："Hello from Instance 1!"
3. 点击发送

**观察控制台输出:**

实例 1:
```
📤 Sending message to 16Uiu2HAmXYZ789...: Hello from Instance 1!
   Message ID: 550e8400-e29b-41d4-a716-446655440000
   ✓ Message sent via libp2p
✅ Message acknowledged: 550e8400-e29b-41d4-a716-446655440000
```

实例 2:
```
📥 Received message from 16Uiu2HAmABC123...: Hello from Instance 1!
```

#### 5. 验证 mDNS 自动发现（可选）

如果两个实例在同一局域网内，mDNS 应该自动发现对方：

```
🔍 Discovered peer via mDNS: 16Uiu2HAmXYZ789... at /ip4/192.168.1.100/tcp/54321
```

---

### 方法 B: 生产模式（更接近真实使用）

#### 1. 构建应用

```bash
cd F:\nebula-chat
npm run tauri build
```

#### 2. 运行两个实例

```bash
# 实例 1
.\src-tauri\target\release\nebula-chat.exe

# 实例 2（新终端）
.\src-tauri\target\release\nebula-chat.exe
```

---

## 🧪 测试场景

### 场景 1: 基础消息传递

1. 实例 1 发送消息给实例 2
2. 验证实例 2 收到消息
3. 实例 2 回复消息
4. 验证实例 1 收到回复

**预期结果:**
- ✅ 消息成功发送
- ✅ 收到 ACK 确认
- ✅ 消息显示在聊天窗口

### 场景 2: 离线消息队列

1. 启动实例 1
2. 在实例 1 中添加实例 2 的 Peer ID
3. 发送消息（实例 2 未启动）
4. 启动实例 2
5. 观察消息是否重传

**预期结果:**
- ⚠️ 当前版本：消息会进入队列，但需要手动重连
- 📝 TODO: 实现自动重传机制

### 场景 3: mDNS 自动发现

1. 启动两个实例（同一局域网）
2. 观察控制台输出

**预期结果:**
```
🔍 Discovered peer via mDNS: 16Uiu2HAm... at /ip4/...
✅ Connected to peer: 16Uiu2HAm...
```

### 场景 4: 断开重连

1. 建立连接并发送消息
2. 关闭实例 2
3. 观察实例 1 的状态变化
4. 重新启动实例 2

**预期结果:**
```
# 实例 1
❌ Disconnected from peer: 16Uiu2HAm... (cause: ...)
✅ Connected to peer: 16Uiu2HAm... (重新连接)
```

---

## 📊 控制台日志说明

### 正常连接流程

```
✅ P2P Engine initialized with FULL libp2p integration
   Peer ID: 16Uiu2HAm...
   
🚀 P2P engine started with REAL network transport
   Listening for incoming connections...
   mDNS discovery enabled

📡 Listening on: /ip4/0.0.0.0/tcp/54321

🔍 Discovered peer via mDNS: 16Uiu2HAmXYZ... at /ip4/192.168.1.100/tcp/12345
📞 Dialing peer at /ip4/192.168.1.100/tcp/12345
✅ Connected to peer: 16Uiu2HAmXYZ... via Dialer { ... }
```

### 消息发送流程

```
📤 Sending message to 16Uiu2HAmXYZ...: Hello!
   Message ID: 550e8400-e29b-41d4-a716-446655440000
   ✓ Message sent via libp2p
✅ Message acknowledged: 550e8400-e29b-41d4-a716-446655440000
```

### 消息接收流程

```
📥 Received message from 16Uiu2HAmABC...: Hi there!
```

### 断开连接

```
❌ Disconnected from peer: 16Uiu2HAmXYZ... (cause: IO(Custom { kind: UnexpectedEof, error: ... }))
```

---

## 🐛 故障排查

### 问题 1: 无法连接

**症状:** 添加 Peer 后一直显示 "Connecting..."

**可能原因:**
1. 防火墙阻止连接
2. Peer ID 错误
3. 对方未启动

**解决方案:**
```bash
# 检查防火墙设置
# Windows: 允许 nebula-chat.exe 通过防火墙

# 验证 Peer ID 格式
# 正确：16Uiu2HAmABC123...
# 错误：ABC123 (缺少前缀)
```

### 问题 2: mDNS 未发现 Peer

**症状:** 没有看到 "Discovered peer via mDNS" 日志

**可能原因:**
1. 不在同一局域网
2. 网络隔离（虚拟机、容器）
3. mDNS 被防火墙阻止

**解决方案:**
- 手动添加 Peer ID 和地址
- 检查网络配置

### 问题 3: 消息发送失败

**症状:** 显示 "Outbound failure"

**可能原因:**
1. 连接已断开
2. 协议不匹配

**解决方案:**
```
# 检查协议名称
# 当前使用：/nebula-chat/1.0.0
# 两个实例必须使用相同协议
```

---

## 📝 测试检查清单

### 基础功能
- [ ] 启动实例 1
- [ ] 启动实例 2
- [ ] 记录两个 Peer ID
- [ ] 实例 1 添加实例 2
- [ ] 实例 2 添加实例 1
- [ ] 观察到连接建立

### 消息测试
- [ ] 实例 1 → 实例 2 发送消息
- [ ] 实例 2 收到消息
- [ ] 实例 2 → 实例 1 回复消息
- [ ] 实例 1 收到回复
- [ ] 消息显示在聊天窗口

### 高级功能
- [ ] mDNS 自动发现（如果适用）
- [ ] 断开重连
- [ ] 多个联系人
- [ ] 消息历史记录

---

## 🎉 成功标志

测试成功的标志：

1. ✅ 两个实例都成功启动
2. ✅ 能够互相添加为联系人
3. ✅ 消息成功发送和接收
4. ✅ 控制台显示正确的日志
5. ✅ 前端 UI 显示消息

---

## 📚 下一步

测试通过后：

1. **完善 UI**
   - 显示连接状态
   - 显示 Peer ID（带复制按钮）
   - 消息发送状态指示器

2. **添加功能**
   - 消息持久化到 SQLite
   - 文件传输
   - 群组聊天

3. **优化性能**
   - 消息队列和重试
   - 连接池管理
   - 离线消息

---

**文档生成时间:** 2026-02-24  
**版本:** v0.1.0-alpha  
**状态:** ✅ Ready for Testing

🌌 **Nebula Chat - Real P2P Communication Enabled**
