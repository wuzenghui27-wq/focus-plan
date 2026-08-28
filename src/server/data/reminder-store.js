import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function createReminderStore(databasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push_reminder_jobs (
      endpoint TEXT NOT NULL REFERENCES push_subscriptions(endpoint)
        ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      reminder_at INTEGER NOT NULL,
      notification_title TEXT NOT NULL,
      body TEXT NOT NULL,
      tag TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL,
      sent_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (endpoint, plan_id)
    );
    CREATE INDEX IF NOT EXISTS push_reminder_jobs_due
      ON push_reminder_jobs(status, next_attempt_at, reminder_at);
  `);

  return {
    savePushSubscription(subscription, savedAt) {
      database.prepare(`
        INSERT INTO push_subscriptions (
          endpoint, payload, created_at, updated_at
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `).run(
        subscription.endpoint,
        JSON.stringify(subscription),
        savedAt,
        savedAt
      );
    },
    getPushSubscription(endpoint) {
      const record = database.prepare(
        "SELECT payload FROM push_subscriptions WHERE endpoint = ?"
      ).get(endpoint);
      return record ? JSON.parse(record.payload) : null;
    },
    deletePushSubscription(endpoint) {
      return database.prepare(
        "DELETE FROM push_subscriptions WHERE endpoint = ?"
      ).run(endpoint).changes > 0;
    },
    syncPushReminderJobs(endpoint, jobs, savedAt) {
      const currentJobs = database.prepare(`
        SELECT plan_id, reminder_at, status
        FROM push_reminder_jobs
        WHERE endpoint = ?
      `).all(endpoint);
      const currentByPlanId = new Map(
        currentJobs.map(function (job) {
          return [job.plan_id, job];
        })
      );
      const keepPlanIds = new Set();
      const insertJob = database.prepare(`
        INSERT INTO push_reminder_jobs (
          endpoint, plan_id, reminder_at, notification_title, body,
          tag, url, status, attempt_count, next_attempt_at,
          sent_at, last_error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL, NULL, ?, ?)
      `);
      const updateJob = database.prepare(`
        UPDATE push_reminder_jobs
        SET reminder_at = ?,
            notification_title = ?,
            body = ?,
            tag = ?,
            url = ?,
            updated_at = ?
        WHERE endpoint = ? AND plan_id = ?
      `);
      const resetJob = database.prepare(`
        UPDATE push_reminder_jobs
        SET reminder_at = ?,
            notification_title = ?,
            body = ?,
            tag = ?,
            url = ?,
            status = 'pending',
            attempt_count = 0,
            next_attempt_at = ?,
            sent_at = NULL,
            last_error = NULL,
            updated_at = ?
        WHERE endpoint = ? AND plan_id = ?
      `);
      const deleteJob = database.prepare(`
        DELETE FROM push_reminder_jobs
        WHERE endpoint = ? AND plan_id = ?
      `);

      database.exec("BEGIN IMMEDIATE");
      try {
        jobs.forEach(function (job) {
          const reminderAt = new Date(job.reminderAt).getTime();
          const current = currentByPlanId.get(job.planId);
          keepPlanIds.add(job.planId);

          if (!current) {
            insertJob.run(
              endpoint,
              job.planId,
              reminderAt,
              job.notificationTitle,
              job.body,
              job.tag,
              job.url,
              reminderAt,
              savedAt,
              savedAt
            );
            return;
          }

          const timeChanged = current.reminder_at !== reminderAt;
          const statement = timeChanged ? resetJob : updateJob;
          const parameters = [
            reminderAt,
            job.notificationTitle,
            job.body,
            job.tag,
            job.url
          ];

          if (timeChanged) {
            parameters.push(reminderAt);
          }
          parameters.push(savedAt, endpoint, job.planId);
          statement.run(...parameters);
        });

        currentJobs.forEach(function (job) {
          if (!keepPlanIds.has(job.plan_id)) {
            deleteJob.run(endpoint, job.plan_id);
          }
        });
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    getPushReminderJobs(endpoint) {
      return database.prepare(`
        SELECT
          plan_id AS planId,
          reminder_at AS reminderAt,
          notification_title AS notificationTitle,
          body,
          tag,
          url,
          status,
          attempt_count AS attemptCount,
          next_attempt_at AS nextAttemptAt,
          sent_at AS sentAt,
          last_error AS lastError
        FROM push_reminder_jobs
        WHERE endpoint = ?
        ORDER BY reminder_at, plan_id
      `).all(endpoint);
    },
    getDuePushReminderJobs(now, limit) {
      return database.prepare(`
        SELECT
          jobs.endpoint,
          jobs.plan_id AS planId,
          jobs.reminder_at AS reminderAt,
          jobs.notification_title AS notificationTitle,
          jobs.body,
          jobs.tag,
          jobs.url,
          jobs.attempt_count AS attemptCount,
          subscriptions.payload AS subscriptionPayload
        FROM push_reminder_jobs AS jobs
        JOIN push_subscriptions AS subscriptions
          ON subscriptions.endpoint = jobs.endpoint
        WHERE jobs.status = 'pending'
          AND jobs.reminder_at <= ?
          AND jobs.next_attempt_at <= ?
        ORDER BY jobs.reminder_at
        LIMIT ?
      `).all(now, now, limit).map(function (job) {
        return {
          ...job,
          subscription: JSON.parse(job.subscriptionPayload)
        };
      });
    },
    markPushReminderSent(endpoint, planId, reminderAt, sentAt) {
      database.prepare(`
        UPDATE push_reminder_jobs
        SET status = 'sent',
            sent_at = ?,
            last_error = NULL,
            updated_at = ?
        WHERE endpoint = ?
          AND plan_id = ?
          AND reminder_at = ?
          AND status = 'pending'
      `).run(sentAt, sentAt, endpoint, planId, reminderAt);
    },
    reschedulePushReminder(
      endpoint,
      planId,
      reminderAt,
      attemptCount,
      nextAttemptAt,
      lastError,
      updatedAt
    ) {
      database.prepare(`
        UPDATE push_reminder_jobs
        SET attempt_count = ?,
            next_attempt_at = ?,
            last_error = ?,
            updated_at = ?
        WHERE endpoint = ?
          AND plan_id = ?
          AND reminder_at = ?
          AND status = 'pending'
      `).run(
        attemptCount,
        nextAttemptAt,
        String(lastError || "").slice(0, 240),
        updatedAt,
        endpoint,
        planId,
        reminderAt
      );
    },
    close() {
      database.close();
    }
  };
}

export { createReminderStore };
