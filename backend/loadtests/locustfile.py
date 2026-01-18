"""
Locust stress tests for the Gmail-style Email API.

This file provides auth-aware load testing with 100 concurrent users,
each with separate login/auth sessions using real user emails from fixtures.

Usage:
    locust -f locustfile.py --host=https://aws-gmail-staging.turing.com

    For 100 concurrent users:
    locust -f locustfile.py --host=https://aws-gmail-staging.turing.com -u 100 -r 10

    Web UI available at: http://localhost:8089
"""

import random
import json
import sys
import codecs
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from locust import HttpUser, task, between, events

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())


# Active users from fixtures (extracted from backend/fixtures/users.json)
# Only including users with active=true
FIXTURE_USERS = [
    # Admin users
    {"email": "john.doe@example.com", "role": "admin"},
    {"email": "sarah.williams@example.com", "role": "admin"},
    {"email": "michael.chen@example.com", "role": "admin"},
    {"email": "kelly73@example.org", "role": "admin"},
    {"email": "flynnjohn@example.com", "role": "admin"},
    {"email": "griffithsean@example.com", "role": "admin"},
    # Regular users
    {"email": "jane.smith@example.com", "role": "user"},
    {"email": "david.brown@example.com", "role": "user"},
    {"email": "emily.davis@example.com", "role": "user"},
    {"email": "kwalls@example.net", "role": "user"},
    {"email": "hthompson@example.com", "role": "user"},
    {"email": "huffmanelizabeth@example.com", "role": "user"},
    {"email": "daniel80@example.org", "role": "user"},
    {"email": "jennifer69@example.org", "role": "user"},
    {"email": "phamjanet@example.org", "role": "user"},
    {"email": "sheena07@example.net", "role": "user"},
    {"email": "downsbrandi@example.org", "role": "user"},
    {"email": "anthony03@example.net", "role": "user"},
    {"email": "patrick17@example.org", "role": "user"},
    {"email": "dustin30@example.net", "role": "user"},
    {"email": "donovanjohn@example.net", "role": "user"},
    {"email": "norma12@example.com", "role": "user"},
    {"email": "robertsrenee@example.net", "role": "user"},
    {"email": "davissean@example.org", "role": "user"},
    {"email": "katherinelopez@example.com", "role": "user"},
    {"email": "scottsamantha@example.net", "role": "user"},
    {"email": "maria33@example.com", "role": "user"},
    {"email": "nelsonamy@example.com", "role": "user"},
    {"email": "kennethjordan@example.net", "role": "user"},
    {"email": "sharonhart@example.net", "role": "user"},
    {"email": "voconnor@example.net", "role": "user"},
    {"email": "olopez@example.com", "role": "user"},
    {"email": "shanegrimes@example.com", "role": "user"},
    {"email": "marisawhite@example.net", "role": "user"},
    {"email": "nobleapril@example.com", "role": "user"},
    {"email": "jason59@example.net", "role": "user"},
    {"email": "shepherdkatherine@example.net", "role": "user"},
    {"email": "amandasalinas@example.org", "role": "user"},
    {"email": "jeremyjohnson@example.org", "role": "user"},
    {"email": "tinabarr@example.com", "role": "user"},
    {"email": "hayesrobert@example.net", "role": "user"},
    {"email": "meadowsomar@example.net", "role": "user"},
    {"email": "patricia41@example.net", "role": "user"},
    {"email": "hallnina@example.net", "role": "user"},
    {"email": "garypowell@example.net", "role": "user"},
    {"email": "whitneyeric@example.net", "role": "user"},
    {"email": "emmaodom@example.com", "role": "user"},
]

# Track user assignment to ensure unique users per Locust instance
_user_index = 0

# Single user mode - all users authenticate with the same email but get separate tokens
SINGLE_USER_MODE = True
SINGLE_USER_EMAIL = "john.doe@example.com"
SINGLE_USER_ROLE = "admin"


def get_next_user():
    """Get the next user from fixtures in round-robin fashion."""
    global _user_index
    
    # If single user mode, always return the same user
    if SINGLE_USER_MODE:
        return {"email": SINGLE_USER_EMAIL, "role": SINGLE_USER_ROLE}
    
    user = FIXTURE_USERS[_user_index % len(FIXTURE_USERS)]
    _user_index += 1
    return user


class AuthenticatedEmailUser(HttpUser):
    """
    Simulates an authenticated user interacting with the email API.
    
    Each user instance:
    1. Authenticates with a unique email from fixtures
    2. Receives a JWT token and run_id for their session
    3. Performs various email operations with proper auth headers
    """
    
    # Make this class abstract so only AdminUser and RegularUser are instantiated
    abstract = True
    
    # Wait 0.5-1.5 seconds between tasks for faster load testing
    wait_time = between(0.5, 1.5)
    
    # User session state
    access_token: Optional[str] = None
    run_id: Optional[str] = None
    user_data: Optional[dict] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    auth_complete: bool = False  # Flag to track if authentication has finished
    
    # Cached data for operations
    email_ids: list = []
    thread_ids: list = []
    label_ids: list = []
    
    def on_start(self):
        """Called when a simulated user starts. First request is always authentication."""
        self._authenticate()
        self.auth_complete = True  # Mark auth as complete (success or failure)
    
    def _unwrap_response(self, response_json: dict) -> dict:
        """Unwrap API response envelope. API returns {success, message, statusCode, data}."""
        if response_json is None:
            return {}
        # If response has 'data' key, it's the standard envelope format
        if "data" in response_json:
            return response_json.get("data") or {}
        # Otherwise return as-is (for backwards compatibility)
        return response_json
    
    def _authenticate(self, max_retries: int = 3):
        """Authenticate user and store token. First request for each user."""
        # Get user credentials (all users use same email in single user mode)
        fixture_user = get_next_user()
        self.user_email = fixture_user["email"]
        self.user_role = fixture_user["role"]
        
        for attempt in range(max_retries):
            # First request: POST /auth/token to get Bearer token
            with self.client.post(
                "/api/v1/auth/token",
                json={"email": self.user_email},
                name="/api/v1/auth/token [AUTH]",
                catch_response=True
            ) as response:
                if response.status_code == 200:
                    response_json = response.json()
                    data = self._unwrap_response(response_json)
                    self.access_token = data.get("access_token")
                    self.run_id = data.get("run_id")
                    self.user_data = data.get("user")
                    response.success()
                    return  # Success - exit retry loop
                else:
                    response.failure(f"Auth failed: {response.status_code}")
            
            # Wait before retry (short delay)
            if attempt < max_retries - 1:
                import time
                time.sleep(0.5)
    
    def _get_auth_headers(self) -> dict:
        """Get headers with authentication token."""
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if self.run_id:
            headers["X-Run-ID"] = self.run_id
        return headers
    
    # =========================================================================
    # AUTH TASKS
    # =========================================================================
    
    @task(1)
    def get_current_user(self):
        """Get current authenticated user info."""
        # Skip if auth is still in progress or failed
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/auth/me",
            headers=self._get_auth_headers(),
            name="/api/v1/auth/me"
        )
    
    # =========================================================================
    # EMAIL TASKS (Most common operations - higher weight)
    # =========================================================================
    
    @task(10)
    def list_inbox_emails(self):
        """List emails in inbox - most common operation."""
        # Skip if no valid auth token
        if not self.auth_complete or not self.access_token:
            return
        
        with self.client.get(
            "/api/v1/emails",
            params={"folder": "inbox", "page": 1, "page_size": 20},
            headers=self._get_auth_headers(),
            name="/api/v1/emails [INBOX]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response_json = response.json()
                data = self._unwrap_response(response_json)
                # Cache email IDs for other operations
                results = data.get("results", [])
                self.email_ids = [e["id"] for e in results if "id" in e]
                self.thread_ids = [e["thread_id"] for e in results if e.get("thread_id")]
                response.success()
            else:
                response.failure(f"Failed to list inbox: {response.status_code}")
    
    @task(5)
    def list_sent_emails(self):
        """List sent emails."""
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/emails",
            params={"folder": "sent", "page": 1, "page_size": 20},
            headers=self._get_auth_headers(),
            name="/api/v1/emails [SENT]"
        )
    
    @task(3)
    def list_draft_emails(self):
        """List draft emails."""
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/emails",
            params={"folder": "drafts", "page": 1, "page_size": 20},
            headers=self._get_auth_headers(),
            name="/api/v1/emails [DRAFTS]"
        )
    
    @task(2)
    def list_starred_emails(self):
        """List starred emails."""
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/emails",
            params={"is_starred": True, "page": 1, "page_size": 20},
            headers=self._get_auth_headers(),
            name="/api/v1/emails [STARRED]"
        )
    
    @task(1)
    def create_draft_email(self):
        """Create a new draft email."""
        if not self.auth_complete or not self.access_token:
            return
        
        # Pick a random recipient from fixture users
        recipient = random.choice(FIXTURE_USERS)
        
        draft_data = {
            "subject": f"Load Test Draft - {datetime.now().isoformat()}",
            "body": "This is a test draft email created by Locust load testing.",
            "recipients": [
                {
                    "email": recipient["email"],
                    "type": "to"
                }
            ]
        }
        
        with self.client.post(
            "/api/v1/emails",
            json=draft_data,
            headers=self._get_auth_headers(),
            name="/api/v1/emails [CREATE DRAFT]",
            catch_response=True
        ) as response:
            if response.status_code == 201:
                response_json = response.json()
                data = self._unwrap_response(response_json)
                if data.get("id"):
                    self.email_ids.append(data["id"])
                response.success()
            else:
                response.failure(f"Failed to create draft: {response.status_code}")
    
    # =========================================================================
    # LABEL TASKS
    # =========================================================================
    
    @task(3)
    def list_labels(self):
        """List all labels."""
        if not self.auth_complete or not self.access_token:
            return
        
        with self.client.get(
            "/api/v1/labels",
            params={"include_counts": True, "flat": True},
            headers=self._get_auth_headers(),
            name="/api/v1/labels",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response_json = response.json()
                data = self._unwrap_response(response_json)
                # Cache label IDs - data could be a list or have results
                labels = data if isinstance(data, list) else data.get("results", [])
                self.label_ids = [l["id"] for l in labels if "id" in l and not l.get("is_system")]
                response.success()
            else:
                response.failure(f"Failed to list labels: {response.status_code}")
    
    @task(1)
    def get_label_tree(self):
        """Get labels as hierarchical tree."""
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/labels/tree",
            params={"include_counts": True},
            headers=self._get_auth_headers(),
            name="/api/v1/labels/tree"
        )
    
    @task(1)
    def create_label(self):
        """Create a new label."""
        if not self.auth_complete or not self.access_token:
            return
        
        label_data = {
            "name": f"LoadTest-{uuid4().hex[:8]}",
            "show_in_label_list": True,
            "show_in_message_list": True
        }
        
        with self.client.post(
            "/api/v1/labels",
            json=label_data,
            headers=self._get_auth_headers(),
            name="/api/v1/labels [CREATE]",
            catch_response=True
        ) as response:
            if response.status_code == 201:
                response_json = response.json()
                data = self._unwrap_response(response_json)
                if data.get("id"):
                    self.label_ids.append(data["id"])
                response.success()
            else:
                response.failure(f"Failed to create label: {response.status_code}")
    
    # =========================================================================
    # SEARCH TASKS
    # =========================================================================
    
    @task(4)
    def search_emails(self):
        """Search emails with various queries."""
        if not self.auth_complete or not self.access_token:
            return
        
        # Random search queries
        search_queries = [
            "meeting",
            "report",
            "project",
            "update",
            "review",
            "deadline",
            "urgent",
            "follow up",
        ]
        
        query = random.choice(search_queries)
        self.client.get(
            "/api/v1/search",
            params={"q": query, "page": 1, "page_size": 20},
            headers=self._get_auth_headers(),
            name="/api/v1/search"
        )
    
    @task(2)
    def search_with_filters(self):
        """Search with advanced filters."""
        if not self.auth_complete or not self.access_token:
            return
        
        # Search with various operators
        params = {
            "page": 1,
            "page_size": 20
        }
        
        # Randomly pick a filter type
        filter_type = random.choice(["unread", "starred", "attachment", "date"])
        
        if filter_type == "unread":
            params["is_read"] = False
        elif filter_type == "starred":
            params["is_starred"] = True
        elif filter_type == "attachment":
            params["has_attachment"] = True
        elif filter_type == "date":
            # Emails from last 7 days
            date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            params["date_from"] = date_from
        
        self.client.get(
            "/api/v1/search",
            params=params,
            headers=self._get_auth_headers(),
            name=f"/api/v1/search [{filter_type.upper()}]"
        )
    
    @task(1)
    def get_search_suggestions(self):
        """Get search suggestions."""
        if not self.auth_complete or not self.access_token:
            return
        
        partial_queries = ["from:", "to:", "subject:", "in:", "is:"]
        query = random.choice(partial_queries)
        
        self.client.get(
            "/api/v1/search/suggestions",
            params={"q": query, "limit": 10},
            headers=self._get_auth_headers(),
            name="/api/v1/search/suggestions"
        )
    
    # =========================================================================
    # USER TASKS
    # =========================================================================
    
    @task(2)
    def list_users(self):
        """List users (contacts)."""
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/users",
            params={"page": 1, "page_size": 20},
            headers=self._get_auth_headers(),
            name="/api/v1/users"
        )
    
    @task(1)
    def search_users(self):
        """Search users by name."""
        if not self.auth_complete or not self.access_token:
            return
        
        search_terms = ["john", "sarah", "david", "jane", "michael"]
        search = random.choice(search_terms)
        
        self.client.get(
            "/api/v1/users",
            params={"search": search, "page": 1, "page_size": 10},
            headers=self._get_auth_headers(),
            name="/api/v1/users [SEARCH]"
        )


class AdminUser(AuthenticatedEmailUser):
    """
    Admin user with additional admin-specific tasks.
    Weight is lower since there are fewer admins.
    """
    weight = 1  # Lower weight compared to regular users
    
    def on_start(self):
        """Authenticate as an admin user. First request is always authentication."""
        # Use single user mode or pick from admin users
        if SINGLE_USER_MODE:
            self.user_email = SINGLE_USER_EMAIL
            self.user_role = SINGLE_USER_ROLE
        else:
            admin_users = [u for u in FIXTURE_USERS if u["role"] == "admin"]
            fixture_user = random.choice(admin_users)
            self.user_email = fixture_user["email"]
            self.user_role = fixture_user["role"]
        
        # First request: POST /auth/token to get Bearer token
        with self.client.post(
            "/api/v1/auth/token",
            json={"email": self.user_email},
            name="/api/v1/auth/token [AUTH]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response_json = response.json()
                data = self._unwrap_response(response_json)
                self.access_token = data.get("access_token")
                self.run_id = data.get("run_id")
                self.user_data = data.get("user")
                response.success()
            else:
                response.failure(f"Auth failed: {response.status_code}")
        
        self.auth_complete = True
    
    @task(1)
    def list_all_users_admin(self):
        """Admin: List all users including inactive."""
        if not self.auth_complete or not self.access_token:
            return
        
        self.client.get(
            "/api/v1/users",
            params={"page": 1, "page_size": 50},
            headers=self._get_auth_headers(),
            name="/api/v1/users [ADMIN]"
        )


class RegularUser(AuthenticatedEmailUser):
    """Regular user performing typical email operations."""
    weight = 9  # Higher weight - most users are regular users


# =========================================================================
# EVENT HOOKS FOR STATISTICS
# =========================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when load test starts."""
    print("=" * 60)
    print("Starting Email API Load Test")
    print(f"Target Host: {environment.host}")
    print(f"Available Test Users: {len(FIXTURE_USERS)}")
    print("=" * 60)


@events.test_stop.add_listener  
def on_test_stop(environment, **kwargs):
    """Called when load test stops."""
    print("=" * 60)
    print("Load Test Completed")
    print("=" * 60)


# =========================================================================
# MAIN ENTRY POINT
# =========================================================================

if __name__ == "__main__":
    # This allows running with: python locustfile.py
    import os
    os.system("locust -f locustfile.py")
