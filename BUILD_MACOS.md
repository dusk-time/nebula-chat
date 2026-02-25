# Nebula Chat - macOS 构建指南

**重要提示:** ⚠️ **无法在 Windows 上直接构建 macOS 应用**

Tauri 需要使用 macOS 的 Xcode 和 Rust 工具链才能编译 macOS 版本。

---

## 🛠️ 解决方案

### 方案 A: 在 macOS 上构建（推荐）

如果您有 Mac 电脑：

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd nebula-chat

# 2. 安装依赖
npm install

# 3. 构建 macOS 应用
npm run tauri build
```

**输出位置:**
```
src-tauri/target/release/bundle/
├── macos/
│   └── Nebula Chat.app          # macOS 应用包
└── dmg/
    └── Nebula Chat_0.1.0_x64.dmg  # DMG 安装包
```

---

### 方案 B: 使用 GitHub Actions 自动构建

在项目根目录创建 `.github/workflows/build.yml`：

```yaml
name: Build Nebula Chat

on:
  push:
    tags:
      - 'v*'

jobs:
  build-macos:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm install
      
      - name: Build Tauri App
        run: npm run tauri build
      
      - name: Upload macOS App
        uses: actions/upload-artifact@v4
        with:
          name: nebula-chat-macos
          path: src-tauri/target/release/bundle/
```

---

### 方案 C: 使用云构建服务

1. **GitHub Actions** (免费)
   - 配置如上
   - 每次 push tag 自动构建

2. **Tauri CI** (官方推荐)
   - https://tauri.app/v1/guides/building/cross-platform

3. **MacinCloud** (付费)
   - 远程 macOS 服务器
   - https://www.macincloud.com/

---

## 📦 当前可构建的版本

在 Windows 上可以构建：

### Windows 版本

```bash
cd F:\nebula-chat
npm run tauri build
```

**输出:**
```
src-tauri/target/release/bundle/
├── msi/
│   └── Nebula Chat_0.1.0_x64.msi  # Windows 安装包
└── nsis/
    └── Nebula Chat_0.1.0_x64-setup.exe  # Windows 安装程序
```

### Linux 版本 (需要 Linux 环境)

```bash
# 在 Linux 上运行
npm run tauri build
```

**输出:**
```
src-tauri/target/release/bundle/
├── deb/
│   └── nebula-chat_0.1.0_amd64.deb  # Debian/Ubuntu 包
└── appimage/
    └── Nebula Chat_0.1.0_amd64.AppImage  # AppImage
```

---

## 🚀 快速测试方案

### 使用开发模式跨平台测试

如果您只是想测试功能，可以使用开发模式：

```bash
# 在任何平台（Windows/Mac/Linux）
cd nebula-chat
npm run tauri dev
```

这会启动开发服务器并运行应用，适合功能测试。

---

## 📋 macOS 构建前置条件

在 macOS 上构建需要：

1. **macOS 10.15+**
2. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

3. **Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

4. **Node.js 18+**
   ```bash
   brew install node
   ```

5. **依赖**
   ```bash
   npm install
   ```

---

## 🎯 建议流程

1. **立即可做:**
   - 在 Windows 上构建测试版本
   - 使用开发模式验证功能
   - 双实例测试 P2P 通信

2. **短期:**
   - 配置 GitHub Actions 自动构建
   - 在 macOS 上测试和构建

3. **发布:**
   - 为三个平台构建 (Windows/macOS/Linux)
   - 创建 Release
   - 提供下载链接

---

## 📦 当前构建状态

**前端:** ✅ 已构建 (`dist/` 目录)
**Windows:** ⏳ 待构建
**macOS:** ❌ 需要 macOS 环境
**Linux:** ❌ 需要 Linux 环境

---

## 💡 临时解决方案

如果您需要快速分享 macOS 版本：

1. **使用 TestFlight** (需要 Apple Developer 账号)
2. **提供源码 + 构建说明**
3. **使用 Docker 容器** (仅适合后端测试)
4. **等待 GitHub Actions 构建**

---

**文档生成时间:** 2026-02-24  
**版本:** v0.1.0-alpha

🌌 **Nebula Chat - Cross-Platform P2P Chat**
