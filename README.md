# 三八节专属赞美生成器 🌸

一个用 AI 生成三八妇女节专属赞美的小工具，基于 Google Gemini 免费 API，部署在 Vercel 上，零成本可分享给任何人使用。

---

## 功能特性

- **写给她**：输入姓名、关系、特质，生成一段专属赞美
- **写给自己**：三八节也可以好好赞美自己
- **4 种文字风格**：温柔诗意 / 真诚走心 / 轻松俏皮 / 大气有力
- **生成卡片**：一键生成可分享的图片卡片
- **可编辑**：生成后可直接在页面修改文字

---

## 项目结构

```
womens-day/
├── api/
│   └── generate.js      # 后端：Gemini API 代理（保护 Key）
├── public/
│   └── index.html       # 前端：完整页面（单文件）
├── vercel.json          # Vercel 路由配置
├── package.json         # 声明 ESM 模块
└── README.md
```

---

## 部署教程（约 10 分钟）

### 第一步：获取 Gemini API Key（免费）

1. 访问 [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. 用 Google 账号登录
3. 点击 **"Create API key"**
4. 复制保存好这个 Key（`AIza...` 开头）

> Gemini 免费额度：每分钟 15 次请求，每天 1500 次，完全够个人使用

---

### 第二步：上传代码到 GitHub

1. 访问 [https://github.com](https://github.com)，登录后点右上角 **"+"** → **"New repository"**
2. Repository name 填 `womens-day`，选 **Public**，点 **"Create repository"**
3. 在新建的仓库页面，点击 **"uploading an existing file"**
4. 把本项目所有文件拖入上传（保持目录结构不变）：
   ```
   api/generate.js
   public/index.html
   vercel.json
   package.json
   README.md
   ```
5. 点击 **"Commit changes"** 提交

---

### 第三步：部署到 Vercel

1. 访问 [https://vercel.com](https://vercel.com)，用 **GitHub 账号**登录
2. 点击 **"Add New Project"**
3. 找到 `womens-day` 仓库，点击 **"Import"**
4. 展开 **"Environment Variables"**，添加：
   - **Name**：`GEMINI_API_KEY`
   - **Value**：粘贴你的 Gemini API Key（`AIza...`）
5. 点击 **"Deploy"**，等待约 1 分钟

---

### 完成！🎉

部署成功后 Vercel 会给你一个专属网址，例如：

```
https://womens-day-xxx.vercel.app
```

直接把这个链接分享给朋友即可使用，无需任何安装。

---

## 验证部署是否正确

浏览器访问：`https://你的域名/api/generate`

如果返回：
```json
{ "status": "✅ Gemini API Key 已配置" }
```
说明配置正确，可以正常使用。

如果返回：
```json
{ "status": "❌ 未配置 GEMINI_API_KEY" }
```
说明环境变量没有设置，或设置后没有重新部署。

**重新部署方法**：Vercel 后台 → Deployments → 最新一条 → 点右侧 `⋯` → **Redeploy**

---

## 常见问题

**Q：点击生成没有反应？**  
A：打开浏览器控制台（F12 → Console），查看红色错误信息，截图反馈。

**Q：生成文字不完整？**  
A：检查 `/api/generate` 接口是否返回 200，以及 Gemini API Key 是否有效。

**Q：Gemini API Key 在哪里找？**  
A：[https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)，用 Google 账号免费创建。

**Q：部署有费用吗？**  
A：Vercel 免费套餐足够个人使用，Gemini API 也有免费额度，正常使用不产生费用。

---

## 工作原理

```
用户浏览器
    │ 输入信息，点击生成
    ▼
/api/generate（Vercel 服务器）
    │ 拼装 prompt，调用 Gemini API
    │ GEMINI_API_KEY 保存在服务器，用户看不到
    ▼
Google Gemini API
    │ 流式返回生成的文字
    ▼
用户浏览器实时显示文字
```

API Key 始终保存在 Vercel 服务器的环境变量中，不会暴露给用户。
