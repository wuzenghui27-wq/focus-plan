# 服务器提醒任务调度课程笔记

## 本课目标

让计划提醒不再依赖网页中的定时器：

```text
计划发生变化
→ 浏览器生成标准提醒任务
→ API 同步到 SQLite
→ 服务器调度器扫描到期任务
→ Web Push 发送到设备
→ Service Worker 前台转交或后台显示
```

## 为什么不用长时间 setTimeout

如果为明天的计划直接创建一个 `setTimeout()`：

- Node 服务重启后，内存中的计时器会全部消失。
- 大量计划会产生大量计时器。
- 计划编辑、删除和稍后提醒时，很难保证旧计时器都被取消。
- 多个服务器实例可能重复发送。

因此任务必须先持久化，再由调度器查询。

## 共享任务规则

`src/domain/push-reminders.js` 同时运行在浏览器和 Node：

- 排除已完成和已经提醒的计划。
- 优先使用 `snoozedUntil`。
- 否则使用截止时间减去提前提醒分钟数。
- 生成固定结构的标题、正文、tag、目标页面和 ISO 时间。
- 服务端再次验证字段、长度和允许跳转的页面。

## SQLite 任务状态

`push_reminder_jobs` 使用 `endpoint + plan_id` 作为主键，关键字段包括：

```text
reminder_at      最终提醒时间
status           pending 或 sent
attempt_count    已失败次数
next_attempt_at  下次允许重试的时间
sent_at          成功发送时间
last_error       最近一次错误
```

同步相同提醒时间时保留 `sent`，避免重复。提醒时间改变时恢复为 `pending`。
发送完成和失败重试都带上原提醒时间作为乐观锁；如果用户在发送过程中已经改期，旧发送结果不会
覆盖新任务。

## 调度器

`src/server/reminders/reminder-scheduler.js` 每 15 秒运行一次：

1. 查询 `reminder_at` 和 `next_attempt_at` 都已到达的任务。
2. 每批最多处理 50 条。
3. 发送成功后标记为 `sent`。
4. 普通失败从 30 秒开始指数退避，最长 1 小时。
5. 推送服务返回 404 或 410 时，删除失效订阅及其任务。

调度器还有运行锁，上一轮未结束时不会启动下一轮。

## 前后台去重

服务器推送到达时：

- 有可见页面：Service Worker 使用 `postMessage()` 交给页面，显示应用内提醒。
- 页面隐藏或关闭：Service Worker 调用 `showNotification()` 显示系统通知。

页面收到后台消息后会更新计划的 `reminded`，并同步删除服务器任务。因此不会同时出现应用内提醒
和系统通知。

## 当前边界

- 本地开发时，`npm.cmd run dev` 必须持续运行。
- 正式环境需要 HTTPS 和长期在线的 Node 服务。
- 任务按当前设备 endpoint 保存，不提供跨设备账号同步。
- 多服务器部署时，应把单进程运行锁升级为数据库任务锁或消息队列。
