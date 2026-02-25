# 📝 Peer ID 显示说明

**更新时间:** 2026-02-24 09:38

---

## ⚠️ 重要说明

当前显示的 Peer ID 是**简化版本**，基于公钥生成。

**真正的 Peer ID** 应该从后端 P2P 引擎获取，格式为：
```
16Uiu2HAmABC1234567890abcdefghijklmnopqrstuvwx
```

---

## 🔍 当前显示方式

**界面显示的 Peer ID:**
```
16Uiu2HAm{publicKey 前 40 个字符}
```

这是前端根据公钥生成的**显示用 ID**，用于测试界面功能。

---

## 🎯 获取真实 Peer ID 的方法

### 方法 1: 查看控制台输出（如果使用命令行启动）

```bash
# 从命令行启动应用
.\src-tauri\target\debug\nebula-chat.exe

# 控制台会显示：
✅ P2P Engine initialized with FULL libp2p integration
   Peer ID: 16Uiu2HAmABC123...  ← 这是真实的 Peer ID
   Public Key: CAESAK...
```

### 方法 2: 查看应用日志文件

日志文件位置：
```
%APPDATA%\com.nebula.chat\nebula\logs\
```

### 方法 3: 等待后端集成完成

目前前端显示的 Peer ID 是基于公钥生成的。完整的实现应该：
1. 后端启动 P2P 引擎
2. 生成真实的 libp2p Peer ID
3. 通过 Tauri API 传递给前端
4. 前端显示真实的 Peer ID

---

## 🧪 测试建议

### 当前可以测试的功能

✅ **界面功能测试:**
- 添加联系人
- 发送消息
- 消息显示
- UI 交互

⚠️ **P2P 通信测试:**
- 需要真实的 Peer ID 才能进行
- 当前显示的 ID 可能无法用于真实 P2P 连接

### 完整的 P2P 测试步骤

1. **从命令行启动应用**（可以看到真实 Peer ID）
   ```bash
   cd F:\nebula-chat\src-tauri
   cargo run
   ```

2. **记录控制台输出的 Peer ID**

3. **使用真实 Peer ID 添加联系人**

4. **测试消息传输**

---

## 📊 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| **前端界面** | ✅ 完成 | Peer ID 显示正常 |
| **后端 P2P** | ✅ 完成 | libp2p 集成完成 |
| **前后端连接** | ⚠️ 待完善 | Peer ID 未从后端获取 |
| **真实 P2P 通信** | ⏳ 待测试 | 需要真实 Peer ID |

---

## 🛠️ 下一步

### 方案 A: 快速测试（推荐）

从命令行启动应用，查看真实 Peer ID：

```bash
# 终端 1
cd F:\nebula-chat\src-tauri
cargo run

# 终端 2
cd F:\nebula-chat\src-tauri
cargo run
```

### 方案 B: 完善前后端连接

修改代码，让前端从后端获取真实的 Peer ID：

1. 添加 Tauri 命令 `get_local_peer_id()`
2. 前端调用该命令获取真实 Peer ID
3. 更新界面显示

---

## 💡 临时解决方案

如果现在就要测试，可以：

1. **使用命令行启动**查看真实 Peer ID
2. **手动复制**控制台的 Peer ID
3. **在界面中粘贴**添加联系人

或者等待完善前后端连接后再测试。

---

**文档生成时间:** 2026-02-24 09:38  
**状态:** ⚠️ Peer ID 显示为简化版本，真实 P2P 测试需要真实 Peer ID

🌌 **Nebula Chat**
