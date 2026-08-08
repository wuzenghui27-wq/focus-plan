# FanP

一个使用原生 HTML、CSS 和 JavaScript 制作的计划管理与专注计时 Web
项目，也是从零学习前端开发的课程项目。

## 功能

- 创建、编辑、延期、完成、删除和批量管理计划
- 标签、优先级、截止时间、重复计划、提前提醒和子任务
- 自定义专注时间、短休息、长休息和自动开始
- 计时状态恢复、专注历史、统计图表和每日目标
- 浏览器通知、卡农旋律提示、音量和静音设置
- 手机顶部滑入提醒、上滑关闭和电脑左下角提醒
- Web Push 设备订阅、后台接收和测试推送
- SQLite 后台提醒任务、到期调度和失败重试
- 深色模式、本地数据管理和响应式布局
- 五页移动端导航和 iPhone 安全区域适配
- 英中输入自动识别、双语释义、英文词性和例句查词页
- CC-CEDICT 英汉词库、开源英文释义和本地查询缓存
- PWA 主屏幕图标和离线应用外壳
- 微信、QQ、手机号登录所需的云同步数据层和 API 契约
- Node.js + SQLite 本地账号服务、手机号开发登录和手动云同步
- 延迟自动同步、网络恢复同步和多设备版本冲突保护

## 本地运行

需要先安装 Node.js，然后在项目目录执行：

```powershell
npm.cmd install
npm.cmd run push:keys
npm.cmd run dictionary:download
npm.cmd run dev
```

打开：

```text
http://127.0.0.1:5500
```

如果 `5500` 端口已被 Live Server 占用，可以临时改用其他端口：

```powershell
$env:PORT="5501"
npm.cmd run dev
```

## 开源查词数据

首次运行前执行 `npm.cmd run dictionary:download`，下载 CC-CEDICT 到本地
`.data/` 目录。它负责中英翻译；英文释义、词性、音标和例句来自 Free
Dictionary API，并在查询后缓存到本地。查词功能不需要账号或 API 密钥。

数据来源和许可证说明见 `docs/open-dictionary-data.md`。

## 自动测试

```powershell
npm.cmd run check
```

该命令会检查 JavaScript 语法并运行全部模块测试。

## 代码结构

- `index.html`：页面结构
- `styles/`：基础、页面、响应式、主题和视觉精修样式
- `src/client/app.js`：浏览器应用入口与启动错误处理
- `src/client/application.js`：功能控制器组装和公共事件绑定
- `src/client/features/`：计划、专注、历史、词典、提醒和设置
- `src/client/services/`：词典、同步和推送 API 客户端
- `src/domain/`：可独立测试的计划、计时、提醒和同步规则
- `src/server/http/`：静态文件服务、HTTP 工具和领域 API 路由
- `src/server/dictionary/`：开源词典数据源、规范化与查询缓存
- `src/server/reminders/`：Web Push 服务和后台提醒调度
- `src/server/data/`：SQLite 账号、会话和同步数据存储
- `tests/`：Node.js 原生测试运行器执行的自动测试
- `service-worker.js`：离线缓存、后台推送接收和通知点击
- `tools/`：语法检查、词典下载和 VAPID 密钥工具
