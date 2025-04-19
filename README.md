# 笔记管理系统

这是一个简单的笔记管理系统，能够读取和编辑指定目录下的Markdown笔记文件。

## 功能特点

- 支持从指定文件夹读取和保存Markdown笔记
- 支持按文件夹和标签分类查看笔记
- 支持搜索笔记内容
- 支持创建、编辑和删除笔记
- 支持Markdown格式预览
- 自动提取笔记标题和标签
- 支持图片文件查看

## 技术栈

- 前端: Next.js, React, TypeScript, Tailwind CSS
- 后端: Next.js API Routes + Python笔记处理模块

## 安装和使用

### 前提条件

- Node.js 18+
- Python 3.8+
- npm 或 pnpm

### 安装步骤

1. 克隆代码库

```bash
git clone https://github.com/yourusername/note-manager.git
cd note-manager
```

2. 安装依赖

```bash
pnpm install
```

3. 配置笔记文件夹路径

默认的笔记路径为 `/Users/jiebai/Documents/GitHub/note/数据库/docs`，你可以在以下文件中修改路径：

- `/app/api/notes/route.ts`
- `/app/api/folders/route.ts`
- `/app/api/images/route.ts`
- `/app/api/file/[...path]/route.ts`

4. 运行开发服务器

```bash
pnpm dev
```

5. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

### 浏览笔记

- 在首页，你可以查看所有笔记的列表
- 可以按文件夹或标签过滤笔记
- 使用搜索框可以按关键词搜索笔记

### 创建新笔记

1. 点击"新笔记"按钮
2. 输入笔记内容
3. 点击"保存"按钮

### 编辑笔记

1. 点击要编辑的笔记
2. 在编辑器中修改内容
3. 点击"保存"按钮保存更改

### 删除笔记

1. 打开要删除的笔记
2. 点击"删除"按钮
3. 确认删除操作

### 创建新文件夹

1. 在侧边栏的"文件夹"部分，点击"+"按钮
2. 输入文件夹名称
3. 点击确认创建

### 标签使用

在笔记中，可以使用 `#标签名` 的格式添加标签，系统会自动识别并分类。

## 项目结构

- `/app` - 前端Next.js应用
  - `/api` - API路由
  - `/edit` - 笔记编辑页面
- `/components` - UI组件
- `/hooks` - React钩子
- `/lib` - 工具函数
- `/note_manager.py` - Python笔记管理模块
- `/note_cli.py` - 命令行工具

## CLI工具

系统还提供了一个命令行工具，可以在终端中操作笔记：

```bash
# 列出所有笔记
python note_cli.py list

# 创建新笔记
python note_cli.py create "标题" --content "内容" --folder "文件夹"

# 读取笔记
python note_cli.py read "相对路径"

# 刷新缓存
python note_cli.py refresh
```

## 贡献

欢迎提交问题报告和改进建议。

## 许可证

MIT 