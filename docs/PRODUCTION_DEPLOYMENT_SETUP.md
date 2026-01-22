# Production Deployment Setup Guide

This guide explains how to configure GitHub Environments for production deployments with manual approval gates.

## Overview

The CD pipeline automatically triggers production deployment after staging deployment succeeds. Production deployment requires manual approval through GitHub Environments protection rules.

## Workflow Flow

```
Push to staging branch
  ↓
Build & Push Images (with SHA tags)
  ↓
deploy-staging job → Deploys to staging
  ↓
[Staging verified manually]
  ↓
deploy-production job (automatic trigger)
  - Uses production environment
  - Waits for manual approval ⏸️
  - After approval: Deploys with same images from staging
  ↓
verify-production job
  - Comprehensive production environment verification
```

## GitHub Environment Configuration

### Step 1: Create Production Environment

1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. Click **New environment**
4. Name it: `production`

### Step 2: Configure Protection Rules

In the `production` environment settings, configure the following:

#### Required Reviewers

1. Enable **Required reviewers**
2. Add team members or individuals who can approve production deployments
3. Recommended: Add at least 2 reviewers for redundancy

**Example reviewers:**
- DevOps team members
- Senior engineers
- Release managers

#### Wait Timer (Optional)

- **Wait timer**: Set to `0` minutes (recommended) or configure a delay if needed
- This adds a delay before deployment starts after approval

#### Deployment Branches

- **Deployment branches**: 
  - Option 1: Restrict to specific branches (e.g., `staging`, `main`)
  - Option 2: Allow all branches (for flexibility with workflow_dispatch)

**Recommended**: Restrict to `staging` branch for automatic deployments, but allow all branches if you need manual workflow_dispatch flexibility.

### Step 3: Configure Environment Secrets

If you need production-specific secrets (different from staging):

1. In the `production` environment settings
2. Go to **Environment secrets**
3. Add any production-specific secrets:
   - `PROD_SYSTEM_URL` (if different from staging)
   - Production database credentials (if different)
   - Production API keys (if different)

**Note**: If secrets are the same for staging and production, you can use repository-level secrets instead.

### Step 4: Configure Environment Variables

1. In the `production` environment settings
2. Go to **Environment variables**
3. Add production-specific variables:
   - `PROD_SYSTEM_URL`: Production application URL (optional, falls back to `SYSTEM_URL`)

## Manual Approval Process

### When Production Deployment is Triggered

1. **Staging deployment completes successfully**
2. **Production job appears** in GitHub Actions with status "Waiting for approval"
3. **Reviewers receive notification** (if GitHub notifications are enabled)

### Approving Production Deployment

1. Go to **Actions** tab in your repository
2. Find the workflow run that shows "Waiting for approval"
3. Click on the workflow run
4. Look for the **"Review deployments"** button or banner
5. Click **"Review deployments"**
6. You'll see the `production` environment pending approval
7. Click **"Approve and deploy"** or **"Reject"**
8. If approved, deployment proceeds automatically

### After Approval

1. Production deployment starts
2. Same Docker images from staging are deployed
3. Health checks run automatically
4. Production verification job runs after deployment
5. Workflow completes successfully

## Image Tag Flow

### Staging Deployment

- Commit SHA: `abc1234` (7 chars)
- Backend image: `ghcr.io/owner/mailg-backend:abc1234`
- Frontend image: `ghcr.io/owner/mailg-frontend:abc1234`

### Production Deployment

- Uses **same commit SHA** from staging job output
- Constructs **identical image tags**: `ghcr.io/owner/mailg-backend:abc1234`
- Ensures production uses **exact same images** verified in staging

## Production Verification

After production deployment, the `verify-production` job runs comprehensive checks:

1. ✅ Backend health endpoint
2. ✅ Frontend accessibility
3. ✅ API endpoint response
4. ✅ Response time check
5. ✅ SSL/TLS certificate (if HTTPS)

If any verification fails, the workflow fails and alerts are sent (if configured).

## Workflow Dispatch (Manual Trigger)

You can also manually trigger production deployment:

1. Go to **Actions** → **CD - Deploy**
2. Click **"Run workflow"**
3. Select:
   - **Environment**: `production`
   - **Skip tests**: (optional)
4. Click **"Run workflow"**

**Note**: When triggered manually via workflow_dispatch, the workflow will:
- Use current commit SHA if staging hasn't run
- Use staging image tags if staging deployment exists

## Troubleshooting

### Production Deployment Not Triggering

- Check that staging deployment completed successfully
- Verify you're pushing to the `staging` branch
- Check workflow conditions in `.github/workflows/cd.yml`

### Approval Not Working

- Verify `production` environment exists in Settings → Environments
- Check that "Required reviewers" is enabled
- Ensure you're added as a reviewer
- Check repository permissions

### Image Tags Not Matching

- Verify `deploy-staging` job outputs are set correctly
- Check that commit SHA is being passed correctly
- Review job dependencies in workflow file

### Verification Failing

- Check production URL is accessible
- Verify `PROD_SYSTEM_URL` or `SYSTEM_URL` variable is set
- Check firewall/network rules
- Review verification logs in Actions

## Best Practices

1. **Always verify staging** before approving production
2. **Review commit SHA** to ensure correct version
3. **Check image tags** match between staging and production
4. **Monitor verification results** after deployment
5. **Use workflow_dispatch** only for emergency deployments
6. **Keep production environment** restricted to trusted reviewers

## Security Considerations

- Production environment should have strict access controls
- Reviewers should be trusted team members
- Consider requiring multiple approvals for critical deployments
- Monitor all production deployments in Actions logs
- Use environment-specific secrets for sensitive data
