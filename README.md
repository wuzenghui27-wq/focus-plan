# FanP

一个使用原生 HTML、CSS 和 JavaScript 制作的计划管理与专注计时 Web
项目，也是从零学习前端开发的课程项目。

## 功能

- 创建、编辑、删除、筛选和批量管理计划
- 标签、优先级、截止时间、重复计划、提前提醒和子任务
- 自定义专注时间、短休息、长休息和自动开始
- 计时状态恢复、专注历史、统计图表、每日目标和成就系统
- 浏览器通知、卡农旋律提示、音量和静音设置
- 手机顶部滑入提醒、上滑关闭和电脑左下角提醒
- Web Push 设备订阅、后台接收和测试推送
- SQLite 后台提醒任务、到期调度和失败重试
- 深色模式、本地数据管理和响应式布局
- 四页移动端导航和 iPhone 安全区域适配
- PWA 主屏幕图标和离线应用外壳
- 微信、QQ、手机号登录所需的云同步数据层和 API 契约
- Node.js + SQLite 本地账号服务、手机号开发登录和手动云同步
- 延迟自动同步、网络恢复同步和多设备版本冲突保护

## 本地运行

需要先安装 Node.js，然后在项目目录执行：

```powershell
npm.cmd install
npm.cmd run push:keys
npm.cmd run dev
```

打开：

```text
http://127.0.0.1:5500
```

## 自动测试

```powershell
npm.cmd run check
```

该命令会检查 JavaScript 语法并运行全部模块测试。

## 代码结构

- `index.html`：页面结构
- `style.css`：页面样式和响应式布局
- `script.js`：界面事件和应用流程
- `*-tools.js`：可独立测试的业务规则模块
- `tests/`：Node.js 自动测试
- `sound-tools.js`：卡农旋律音符、声音设置和数据规则
- `navigation-tools.js`：四页导航、地址哈希和页面标题规则
- `sync-tools.js`：云同步快照和版本判断规则
- `sync-api.js`：账号登录与云同步的前端 API 边界
- `push-api.js`：Web Push 前端 API 与 VAPID 公钥转换
- `push-reminder-tools.js`：把本地计划转换为后台提醒任务
- `server/`：账号、会话、验证码和同步快照后端
- `server/reminder-scheduler.cjs`：扫描并发送到期后台提醒
- `service-worker.js`：离线缓存、后台推送接收和通知点击
- `tools/dev-server.cjs`：本地静态文件服务器
