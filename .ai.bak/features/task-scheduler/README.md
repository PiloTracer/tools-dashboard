# Feature: Task Scheduler

## Overview

Task Scheduler provides administrative task scheduling and job management:
- Create scheduled tasks
- Cron expression support
- Task history and logs
- Task execution monitoring
- Failure notifications
- Task enable/disable

## User Stories

### Admin Users
- As an admin, I want to schedule recurring tasks
- As an admin, I want to monitor task execution
- As an admin, I want to be notified of task failures
- As an admin, I want to view task execution history

## Implementation status

The admin UI exists as a **minimal scaffold** (`front-admin/app/features/task-scheduler/`). There is no `back-api/features/task-scheduler` implementation in this repository yet; do not assume cron execution or `/api/admin/tasks` APIs exist until code lands there.

---

Last Updated: April 22, 2026
