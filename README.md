# 三八节专属赞美生成器 🌸

## 部署到 Vercel（5分钟完成）

### 第一步：准备 Anthropic API Key
1. 访问 https://console.anthropic.com
2. 登录后点击左侧 "API Keys"
3. 点击 "Create Key"，复制保存好这个 Key（sk-ant-... 开头）

### 第二步：上传项目到 GitHub
1. 访问 https://github.com，登录后点击右上角 "+" → "New repository"
2. 仓库名填 `womens-day`，选 Public，点击 "Create repository"
3. 在新页面点击 "uploading an existing file"
4. 把这个压缩包里的所有文件拖进去（保持目录结构）
5. 点击 "Commit changes"

### 第三步：部署到 Vercel
1. 访问 https://vercel.com，用 GitHub 账号登录
2. 点击 "Add New Project"
3. 选择刚才创建的 `womens-day` 仓库，点击 "Import"
4. 点击 "Environment Variables"，添加：
   - Name: `ANTHROPIC_API_KEY`
   - Value: 粘贴你的 API Key（sk-ant-...）
5. 点击 "Deploy"，等待约 1 分钟

### 完成！
部署成功后 Vercel 会给你一个网址，如：
`https://womens-day-xxx.vercel.app`

这个网址可以直接分享给任何人使用 🎉

---

## 项目结构
```
womens-day-vercel/
├── api/
│   └── generate.js      # 后端：代理 Anthropic API（保护 Key）
├── public/
│   └── index.html       # 前端：完整的页面
└── vercel.json          # Vercel 路由配置
```

## 工作原理
```
用户浏览器 → /api/generate（Vercel 服务器）→ Anthropic API
                    ↑
              API Key 藏在这里
              用户看不到
```
