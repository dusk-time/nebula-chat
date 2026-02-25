# 🧪 P2P 连接调试指南

**问题:** 消息没有真正通过网络传输

---

## 🔍 问题诊断

### 当前状态
- ✅ 后端代码正确（调用 `send_request`）
- ✅ 前端调用 API
- ❌ 两个实例没有建立连接
- ❌ 消息进入离线队列（pending_messages）

---

## 📋 连接要求

libp2p 需要以下条件才能通信：

### 1. 网络连接
- ✅ 两个实例在同一局域网
- ✅ 防火墙允许连接
- ⚠️ 需要知道对方的地址（IP + 端口）

### 2. Peer 发现
有两种方式：
- **mDNS 自动发现** - 同一局域网自动发现
- **手动添加地址** - 需要知道对方的 Multiaddr

### 3. 协议匹配
- ✅ 使用相同协议：`/nebula-chat/1.0.0`
- ✅ 使用相同 Codec：CBOR

---

## 🔧 调试步骤

### 步骤 1: 查看控制台日志

从命令行启动实例，查看详细日志：

```bash
# 终端 1
cd F:\nebula-chat\src-tauri
cargo run

# 终端 2
cd F:\nebula-chat\src-tauri
cargo run
```

**应该看到的日志:**
```
✅ P2P Engine initialized with FULL libp2p integration
   Peer ID: 16Uiu2HAmABC...
   Public Key: CAESAK...
   
🚀 P2P engine started with REAL network transport
   Listening for incoming connections...
   mDNS discovery enabled

📡 Listening on: /ip4/192.168.1.100/tcp/54321  ← 监听地址
```

### 步骤 2: 检查 mDNS 发现

如果 mDNS 工作正常，应该看到：

```
🔍 Discovered peer via mDNS: 16Uiu2HAmXYZ... at /ip4/192.168.1.100/tcp/54321
📞 Dialing peer at /ip4/192.168.1.100/tcp/54321
✅ Connected to peer: 16Uiu2HAmXYZ...
```

**如果没有看到:**
- mDNS 可能被防火墙阻止
- 两个实例不在同一网络
- Windows 防火墙阻止了 mDNS

### 步骤 3: 手动添加地址

如果 mDNS 不工作，手动添加地址：

**实例 1 的地址格式:**
```
/ip4/192.168.1.100/tcp/54321
```

**在实例 2 中添加:**
1. 点击"🧪 测试"
2. Peer ID: `16Uiu2HAmABC...` (实例 1 的 ID)
3. 地址：`/ip4/192.168.1.100/tcp/54321` (实例 1 的监听地址)
4. 名称：`实例 1`
5. 点击添加

### 步骤 4: 查看连接状态

**发送消息时的日志:**

**成功连接:**
```
📤 Sending message to 16Uiu2HAmXYZ...: Hello!
   Message ID: xxx
   ✓ Message sent via libp2p  ← 真正发送
```

**未连接（进入队列）:**
```
📤 Sending message to 16Uiu2HAmXYZ...: Hello!
   Message ID: xxx
   ⚠ Peer not connected, queuing message  ← 进入离线队列
```

---

## 🐛 常见问题

### 问题 1: mDNS 不工作

**症状:** 没有看到 "Discovered peer via mDNS"

**解决方案:**
1. 检查 Windows 防火墙
2. 允许应用访问网络
3. 允许 mDNS (UDP 5353)
4. 或手动添加地址

### 问题 2: 连接失败

**症状:** 看到 "Outgoing connection error"

**可能原因:**
- 防火墙阻止
- 地址错误
- 对方未启动

**解决方案:**
1. 关闭防火墙测试
2. 确认地址格式正确
3. 确认对方实例在运行

### 问题 3: 消息进入队列

**症状:** "Peer not connected, queuing message"

**原因:** 没有建立连接

**解决方案:**
1. 等待 mDNS 发现
2. 或手动添加地址
3. 或先建立连接再发送

---

## 🎯 快速测试方案

### 方案 A: 使用命令行启动（推荐）

```bash
# 终端 1
cd F:\nebula-chat\src-tauri
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo run

# 记录输出：
# Peer ID: 16Uiu2HAmABC...
# Listening on: /ip4/127.0.0.1/tcp/54321

# 终端 2
cd F:\nebula-chat\src-tauri
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
cargo run

# 手动添加实例 1 的地址
```

### 方案 B: 查看应用日志

日志位置：
```
%APPDATA%\com.nebula.chat\nebula\logs\
```

---

## 📊 成功标志

**真正 P2P 通信的标志:**

1. ✅ 控制台显示 "Connected to peer"
2. ✅ 控制台显示 "Message sent via libp2p"
3. ✅ 接收方显示 "Received message from"
4. ✅ 消息来自正确的 Peer ID
5. ✅ 不是自动回复

---

## 💡 下一步

**请执行以下步骤:**

1. **从命令行启动两个实例**
   ```bash
   cd F:\nebula-chat\src-tauri
   cargo run
   ```

2. **记录每个实例的:**
   - Peer ID
   - 监听地址（Listening on）

3. **手动添加地址**（如果 mDNS 不工作）

4. **发送测试消息**

5. **查看控制台日志**

**告诉我控制台显示什么！** 📝

---

**文档生成时间:** 2026-02-24 09:55  
**状态:** ⚠️ 需要建立连接才能进行真实 P2P 通信

🌌 **Nebula Chat**
