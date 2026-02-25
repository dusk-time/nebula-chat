# Nebula Chat - 前端使用指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd F:\nebula-chat
npm install
```

### 2. 开发模式运行

```bash
npm run tauri dev
```

### 3. 构建发布版本

```bash
npm run tauri build
```

---

## 📱 界面说明

### 首次启动 - Onboarding

1. **创建身份**
   - 输入用户名
   - 点击"生成新身份"
   - 系统会生成 Ed25519 密钥对

2. **备份身份**
   - 复制并保存生成的 JSON 身份信息
   - ⚠️ **重要：** 丢失后无法恢复！

3. **开始使用**
   - 点击"我已备份，继续"
   - 进入聊天主界面

### 聊天主界面

```
┌─────────────────────────────────────┐
│ 联系人列表 │  聊天区域              │
│             │                       │
│ + 添加联系人 │  [未选择联系人提示]   │
│             │                       │
│ 👤 Peer 1    │                       │
│ 👤 Peer 2    │                       │
│ 👤 Peer 3    │                       │
│             │                       │
└─────────────────────────────────────┘
```

---

## 🔧 功能说明

### 添加联系人

1. 点击侧边栏的 **"+ 添加联系人"**
2. 输入对方的 **Peer ID**（必需）
3. 输入地址（可选，用于直接连接）
4. 点击"添加"

### 发送消息

1. 在联系人列表中选择一个 Peer
2. 在底部输入框输入消息
3. 按 Enter 或点击"发送"

### 查看自己的身份

- 右上角显示当前用户名和 Peer ID
- 点击退出图标可以注销

---

## 📁 项目结构

```
src/
├── App.tsx                 # 主应用组件
├── components/
│   ├── ChatInterface.tsx   # 聊天界面
│   ├── Onboarding.tsx      # 首次启动引导
│   └── ...
├── lib/
│   ├── api.ts              # Tauri API 调用封装
│   ├── types.ts            # TypeScript 类型定义
│   └── utils.ts            # 工具函数
└── index.css               # 全局样式
```

---

## 🔌 API 使用

### 发送消息

```typescript
import { sendChatMessage } from './lib/api';

const messageId = await sendChatMessage(peerId, 'Hello!');
```

### 获取联系人列表

```typescript
import { getPeers } from './lib/api';

const peers = await getPeers();
```

### 监听 P2P 事件

```typescript
import { listenToP2PEvents } from './lib/api';

listenToP2PEvents((event) => {
  switch (event.type) {
    case 'MessageReceived':
      console.log(`${event.from_name}: ${event.content}`);
      break;
    case 'PeerDiscovered':
      console.log(`发现新 Peer: ${event.peer_id}`);
      break;
  }
});
```

---

## 💾 数据存储

### LocalStorage

- `nebula_identity` - 用户身份信息
  ```json
  {
    "secretKey": "...",
    "publicKey": "...",
    "username": "..."
  }
  ```

### SQLite 数据库

位置：`%APPDATA%/nebula/messages.db`

表结构：
- `contacts` - 联系人
- `conversations` - 会话
- `messages` - 消息

---

## 🎨 自定义样式

使用 Tailwind CSS，可以在 `tailwind.config.js` 中修改主题：

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        // ...
      }
    }
  }
}
```

---

## 🐛 常见问题

### Q: 看不到联系人列表？
A: 点击"+ 添加联系人"，输入 Peer ID 添加第一个联系人。

### Q: 消息发送失败？
A: 检查 P2P 引擎是否已启动，查看控制台错误信息。

### Q: 如何备份身份？
A: 在 Onboarding 步骤 2 复制 JSON 并保存到安全位置。

---

## 📝 下一步

1. **测试双实例通信**
   - 运行两个 Nebula Chat 实例
   - 互相添加 Peer ID
   - 发送测试消息

2. **添加更多功能**
   - 文件传输
   - 群组聊天
   - 消息加密显示

3. **优化体验**
   - 添加消息已读回执
   - 实现离线消息队列
   - 添加通知功能

---

**Happy Chatting! 💬**
