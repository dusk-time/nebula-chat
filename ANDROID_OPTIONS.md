# 📱 Nebula Chat Android APK 构建选项

## ✅ 已完成准备

### 1. GitHub Actions 工作流
- **位置:** `.github/workflows/android.yml`
- **功能:** 自动构建 Android APK
- **触发:** 推送代码或手动触发

### 2. 构建指南文档
- `ANDROID_BUILD_GUIDE.md` - 完整构建指南
- `QUICK_ANDROID_SETUP.md` - 快速配置方案
- `ANDROID_OPTIONS.md` - 本文件

---

## 🚀 三种构建方案

### 方案 1: GitHub Actions（推荐 ⭐⭐⭐⭐⭐）

**最简单！无需安装任何东西！**

**步骤：**
1. 将代码推送到 GitHub
2. 在 GitHub 上触发构建
3. 下载 APK

**优点：**
- ✅ 无需安装 Android Studio
- ✅ 无需配置环境
- ✅ 自动构建
- ✅ 云端缓存
- ✅ 免费（每月 2000 分钟）

**缺点：**
- ❌ 需要 GitHub 账号
- ❌ 需要上传代码
- ❌ 构建时间较长（约 30-50 分钟）

**立即开始：**
```bash
cd F:\nebula-chat
git init
git add .
git commit -m "Initial commit - Nebula Chat"
git remote add origin https://github.com/你的用户名/nebula-chat.git
git push -u origin main
```

然后访问 GitHub 仓库 → Actions → 查看构建进度

---

### 方案 2: 本地完整环境（适合开发 ⭐⭐⭐⭐）

**需要安装的软件：**
1. **Android Studio** - https://developer.android.com/studio
2. **Java JDK 17** - https://www.oracle.com/java/technologies/downloads/
3. **Rust Android 目标** - `rustup target add aarch64-linux-android`

**构建命令：**
```bash
cd F:\nebula-chat
npx tauri android init
npx tauri android build --apk
```

**优点：**
- ✅ 快速迭代
- ✅ 本地调试
- ✅ 完全控制
- ✅ 无需上传代码

**缺点：**
- ❌ 安装复杂（约 5-10GB）
- ❌ 配置繁琐
- ❌ 首次构建时间长

**适合：** 长期开发、频繁构建

---

### 方案 3: Docker 容器（折中方案 ⭐⭐⭐）

**需要：** Docker Desktop

**命令：**
```bash
docker pull ghcr.io/tauri-apps/tauri-android:latest
docker run --rm -v ${PWD}:/project \
  ghcr.io/tauri-apps/tauri-android:latest \
  bash -c "cd /project && npx tauri android build --apk"
```

**优点：**
- ✅ 无需安装 Android Studio
- ✅ 环境隔离
- ✅ 可重复构建

**缺点：**
- ❌ 需要 Docker
- ❌ Windows 需要 WSL2
- ❌ 配置复杂

---

## 📊 方案对比

| 特性 | GitHub Actions | 本地环境 | Docker |
|------|----------------|----------|--------|
| **安装难度** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **配置时间** | 5 分钟 | 2-3 小时 | 30 分钟 |
| **构建速度** | 30-50 分钟 | 10-15 分钟 | 20-30 分钟 |
| **适合场景** | 偶尔构建 | 频繁开发 | CI/CD |
| **成本** | 免费 | 免费 | 免费 |
| **隐私** | 代码公开 | 本地 | 本地 |

---

## 🎯 我的推荐

### 如果你只是想测试：
→ **使用 GitHub Actions**（方案 1）

**原因：**
- 最简单
- 无需配置
- 完全免费
- 构建完可以删除仓库

### 如果你要长期开发：
→ **安装本地环境**（方案 2）

**原因：**
- 快速迭代
- 本地调试
- 完全控制

### 如果你需要 CI/CD：
→ **GitHub Actions + Docker**

**原因：**
- 自动化
- 可重复
- 集成测试

---

## 📝 快速开始（GitHub Actions）

### 1. 初始化 Git（如果还没有）

```bash
cd F:\nebula-chat
git init
git add .
git commit -m "Initial commit - Nebula Chat P2P Messenger"
```

### 2. 创建 GitHub 仓库

访问：https://github.com/new

- 仓库名：`nebula-chat`
- 可见性：Public（免费）或 Private
- 不要初始化（我们已经有了代码）

### 3. 推送代码

```bash
git remote add origin https://github.com/你的用户名/nebula-chat.git
git branch -M main
git push -u origin main
```

### 4. 触发构建

访问你的 GitHub 仓库：
- 点击 **Actions** 标签
- 选择 **Android APK Build**
- 点击 **Run workflow**（或等待自动触发）

### 5. 下载 APK

等待构建完成（约 30-50 分钟）：
- 在 Actions 页面找到完成的构建
- 点击构建记录
- 在底部找到 **Artifacts**
- 下载 `nebula-chat-android-apk.zip`

---

## 🔍 常见问题

### Q: 构建失败怎么办？

**A:** 检查 Actions 日志，常见错误：
- 依赖问题 → 清理缓存后重试
- Rust 编译错误 → 检查代码
- Android SDK 问题 → 工作流已自动处理

### Q: 可以构建 iOS 版本吗？

**A:** 可以，但需要：
- macOS 运行环境
- Apple Developer 账号
- Xcode

GitHub Actions 可以使用 macOS runner，但需要付费。

### Q: APK 有多大？

**A:** 预计大小：
- Debug: ~15-20 MB
- Release: ~8-12 MB

### Q: 支持哪些 Android 版本？

**A:** Android 6.0+（API 23+）
推荐：Android 10+（API 29+）

### Q: 需要签名吗？

**A:** 
- Debug 版本：自动签名（可以安装）
- Release 版本：需要签名（用于发布）

---

## 📞 需要帮助？

**文档：**
- `ANDROID_BUILD_GUIDE.md` - 详细构建指南
- `QUICK_ANDROID_SETUP.md` - 环境配置
- `PROJECT_SUMMARY.md` - 项目总结

**官方资源：**
- [Tauri 移动端文档](https://tauri.app/v1/guides/building/mobile)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

---

## ✅ 下一步

**选择你的方案：**

1. **GitHub Actions** → 推送代码到 GitHub
2. **本地环境** → 安装 Android Studio
3. **其他需求** → 告诉我！

---

**创建时间:** 2026-02-25  
**最后更新:** 2026-02-25  
**状态:** 准备就绪，等待选择方案
