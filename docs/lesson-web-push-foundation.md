# Web Push 基础课程笔记

## 本课目标

建立一条可以运行的 Web Push 链路：

```text
设置页
→ 浏览器创建 PushSubscription
→ API 保存订阅
→ Node 服务器发送加密消息
→ 浏览器推送服务转发
→ Service Worker 接收 push 事件
→ 操作系统显示通知
```

## VAPID 密钥

VAPID 密钥用来证明消息来自本应用服务器：

- 公钥可以发送给浏览器，用于创建订阅。
- 私钥只能保存在服务器，不能写进前端 JavaScript 或提交到 Git。
- 一套密钥应长期使用，不能每次启动服务器都重新生成。

本地执行：

```powershell
npm.cmd run push:keys
```

命令会生成 `.env`。项目的 `.gitignore` 已忽略该文件。

## 前端订阅

`src/client/services/push-api.js` 负责访问 Push API：

1. 从服务器获取 VAPID 公钥。
2. 将 Base64 URL 公钥转换为 `Uint8Array`。
3. 调用 `registration.pushManager.subscribe()`。
4. 把浏览器返回的 endpoint、`p256dh` 和 `auth` 发送给服务器。

订阅必须由用户点击触发，并设置：

```js
{
  userVisibleOnly: true,
  applicationServerKey
}
```

## 服务端发送

`src/server/reminders/push-service.js` 使用 `web-push`：

- 验证订阅数据。
- 配置 VAPID 身份。
- 加密通知载荷。
- 将消息发送到浏览器提供的 endpoint。

订阅保存在 SQLite 的 `push_subscriptions` 表中。

## 后台接收

页面关闭后，网页中的前端模块不会运行，但浏览器可以按需启动
`service-worker.js`。其中的 `push` 事件读取服务器消息，并调用：

```js
self.registration.showNotification(title, options);
```

因此 Web Push 不依赖页面中的 `setInterval()`。

## 当前边界

- 本课按设备保存订阅，产品不提供登录账号。
- 测试按钮可以证明链路有效，但计划提醒还没有服务器调度。
- 正式部署必须使用 HTTPS，并设置真实的 VAPID 联系邮箱。
- iPhone 和 iPad 需要 iOS/iPadOS 16.4 或更高版本，并先把网站添加到主屏幕。
- 如果公开部署 API，应增加访问控制、发送频率限制和订阅清理。

下一课会把计划的提醒时间同步到服务器，并建立到期任务调度。
