# 如何运行两个 Nebula Chat 实例进行测试

## ⚠️ 重要：端口冲突问题

你遇到的错误：
```
code: 10048, kind: AddrInUse - 通常每个套接字地址 (协议/网络地址/端口) 只允许使用一次
code: 10061, kind: ConnectionRefused - 由于目标计算机积极拒绝，无法连接
```

**原因：** 在同一台机器上运行了两个使用相同配置的实例。

## ✅ 解决方案

### 方法 1: 使用不同的身份（推荐）

每个实例必须使用**不同的 Ed25519 密钥对**！

#### 实例 A（第一个窗口）
1. 启动应用
2. 创建身份（例如：Alice）
3. 复制 Peer ID：`12D3KooWFADepPN4W7Gr3yXu67BArZmRKBCjkySW5yHMfgdfwd39`

#### 实例 B（第二个窗口）
1. **清除浏览器本地存储** 或使用 **隐私模式/不同浏览器**
2. 启动应用
3. 创建**不同的身份**（例如：Bob）
4. 复制 Peer ID：`12D3KooWPVYd6e2hcgbNsUpk3ZQUeKmrT1C74TbGoC4siXgP8DNn`

### 方法 2: 使用 Tauri 桌面应用（最佳体验）

Tauri 应用会自动管理独立的数据存储：

```bash
cd F:\nebula-chat
npm run tauri dev
```

运行两个实例：
1. 第一个终端：`npm run tauri dev`
2. 第二个终端：需要修改 `tauri.conf.json` 中的 `identifier`

修改 `src-tauri/tauri.conf.json`：
```json
{
  "identifier": "chat.nebula.instance2",  // 改为不同的标识符
  ...
}
```

## 🔧 测试步骤

### 步骤 1: 启动实例 A
```bash
cd F:\nebula-chat
npm run dev  # 或者 npm run tauri dev
```
- 创建身份：Alice
- 复制 Peer ID（例如：`12D3KooWFADepPN4...`）

### 步骤 2: 启动实例 B
**选项 A - 使用不同浏览器：**
- 打开 Firefox（如果实例 A 用的是 Chrome）
- 访问 `http://localhost:5173`
- 创建身份：Bob

**选项 B - 使用隐私模式：**
- 打开新的隐私浏览窗口
- 访问 `http://localhost:5173`
- 创建身份：Bob

**选项 C - 清除本地存储：**
- 按 F12 打开开发者工具
- Console 中输入：`localStorage.clear()`
- 刷新页面
- 创建新身份

### 步骤 3: 添加联系人

在实例 A（Alice）中：
1. 点击 "🧪 测试" 添加测试联系人
2. 编辑联系人，填入实例 B 的 Peer ID

在实例 B（Bob）中：
1. 同样添加实例 A 的 Peer ID

### 步骤 4: 发送消息

1. 在实例 A 中选择 Bob，发送消息 "Hello!"
2. 检查实例 B 是否收到消息

## 🐛 调试技巧

### 查看后端日志
在 Tauri 应用中，后端日志会显示在：
- Windows: 启动应用的终端窗口
- 或者查看 `F:\nebula-chat\src-tauri` 目录

### 查看前端日志
1. 按 **L 键** 显示调试日志窗口
2. 按 **F12** 打开浏览器开发者工具

### 常见问题

**Q: 还是遇到端口冲突？**
A: 确保完全关闭了之前的实例：
```powershell
Get-Process | Where-Object {$_.Path -like "*nebula*"} | Stop-Process -Force
```

**Q: 消息发送成功但对方收不到？**
A: 检查：
1. 两个实例的 Peer ID 是否不同
2. 是否添加了对方为联系人
3. 查看后端日志中的连接状态

**Q: mDNS 没有自动发现？**
A: mDNS 在某些网络环境下可能不工作，需要手动添加：
1. 复制对方的 Peer ID
2. 点击 "+ 添加" 手动输入

## 📝 网络架构说明

```
实例 A (Alice)                    实例 B (Bob)
Peer ID: 12D3KooWFADepPN4...      Peer ID: 12D3KooWPVYd6e2h...
监听：/ip4/0.0.0.0/tcp/随机端口    监听：/ip4/0.0.0.0/tcp/随机端口
                                    ↓
                              手动连接或 mDNS 发现
                                    ↓
                              建立 TCP + Noise + Yamux 连接
                                    ↓
                              通过 Request-Response 协议发送消息
```

## 🎯 成功标志

当你看到以下日志时，说明连接成功：

**实例 A:**
```
✅ Connected to peer: 12D3KooWPVYd6e2h... via Dialer { ... }
📥 Received message from 12D3KooWPVYd6e2h...: Hello!
```

**实例 B:**
```
✅ Connected to peer: 12D3KooWFADepPN4... via Listener { ... }
📥 Received message from 12D3KooWFADepPN4...: Hi there!
```

**前端显示:**
- 调试日志中显示 `🔗 [前端] Peer 连接事件`
- 聊天界面中显示收到的消息
- 联系人列表显示在线状态（绿色圆点）

---

**最后更新:** 2026-02-25
