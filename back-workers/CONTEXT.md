## Background Workers

**Technology**: Celery, Redis Queue, Python 3.11  
**Purpose**: Executes scheduled and background tasks  
**Key Components**:
- Task scheduler
- Worker processes
- Task monitoring
- Error handling

**AI Context Guidelines**:
1. Each task type must be in separate file under /tasks
2. All tasks must define:
   - queue name
   - retry policy
   - resource limits
3. Never store state in workers - use Redis

**Critical Configuration**:
- Max task duration: 30 minutes
- Max retries: 3 with exponential backoff
- Resource limits:
  - CPU: 0.5 core
  - Memory: 512MB
- Task priority levels: high, medium, low

**Security Constraints**:
- All tasks must run in isolated container
- No direct database access (use service APIs)
- Secrets must be passed via environment variables
