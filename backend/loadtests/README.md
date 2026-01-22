# Email API Load Tests

Locust-based stress tests for the Gmail-style Email API with auth-aware concurrent user simulation.

## Setup

```bash
cd backend/loadtests
pip install -r requirements.txt
```

## Running Tests

### Web UI Mode (Recommended for exploration)

```bash
locust -f locustfile.py --host=https://aws-gmail-staging.turing.com
```

Then open http://localhost:8089 in your browser to configure and start the test.

### Command Line Mode (100 Concurrent Users)

```bash
# 100 users, spawn rate of 10 users/second
locust -f locustfile.py --host=https://aws-gmail-staging.turing.com -u 100 -r 10 --headless

# With run time limit (5 minutes)
locust -f locustfile.py --host=https://aws-gmail-staging.turing.com -u 100 -r 10 --headless -t 5m

# Export results to CSV
locust -f locustfile.py --host=https://aws-gmail-staging.turing.com -u 100 -r 10 --headless -t 5m --csv=results
```

### Local Development Testing

```bash
# Against local backend
locust -f locustfile.py --host=http://localhost:8000 -u 10 -r 2 --headless -t 1m
```

## Test Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-u`, `--users` | Number of concurrent users | 1 |
| `-r`, `--spawn-rate` | Users spawned per second | 1 |
| `-t`, `--run-time` | Test duration (e.g., 5m, 1h) | unlimited |
| `--headless` | Run without web UI | false |
| `--csv` | Export results to CSV files | - |

## User Types

The test simulates two types of users:

1. **RegularUser** (weight: 9) - Standard email users performing typical operations
2. **AdminUser** (weight: 1) - Admin users with additional privileges

## Test Scenarios

### Authentication
- Login with JWT token
- Get current user info

### Email Operations (High frequency)
- List inbox emails
- List sent/drafts emails
- Get single email
- Mark read/unread
- Star/unstar emails
- Create draft emails

### Thread Operations
- Get thread emails
- Archive threads
- Mark important

### Label Operations
- List labels
- Get label tree
- Create labels

### Search Operations
- Basic text search
- Advanced filtered search
- Search suggestions

### User Operations
- List contacts
- Search users

## Test Users

Uses 47 active users from `backend/fixtures/users.json`:
- 6 Admin users
- 41 Regular users

Each Locust user instance authenticates with a unique fixture user in round-robin fashion.

## Metrics to Monitor

- **Response Time**: p50, p95, p99 latencies
- **Requests/sec**: Throughput
- **Failure Rate**: % of failed requests
- **Users**: Active concurrent users

## Example Output

```
Type     Name                          # reqs   # fails  Avg   Min   Max  Median  req/s failures/s
--------|-------------------------------|--------|--------|-----|-----|------|-------|-------|--------
GET      /api/v1/emails [INBOX]          1234       0    45    12   234     38   12.3    0.00
GET      /api/v1/emails/{id}              567       0    32     8   156     28    5.7    0.00
POST     /api/v1/auth/token [LOGIN]       100       0    89    45   234     78    1.0    0.00
...
```
