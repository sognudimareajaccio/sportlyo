"""
Test P3 Features: Analytics with Period Filters, Community Pagination, Refunds Admin Filters
- Analytics: period filter (all, 30d, 90d, 365d), KPIs, charts data
- Community: pagination with page/limit, load more
- Refunds Admin: status filter (all, pending, approved, rejected), stats, admin notes
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ============= FIXTURES =============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def organizer_token(api_client):
    """Get organizer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "club@paris-sport.fr",
        "password": "club123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Organizer authentication failed")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@sportsconnect.fr",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def organizer_client(api_client, organizer_token):
    """Session with organizer auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {organizer_token}"
    })
    return session


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_event_id(organizer_client):
    """Get a published event ID for community testing"""
    response = organizer_client.get(f"{BASE_URL}/api/organizer/events")
    if response.status_code == 200:
        events = response.json().get("events", [])
        published_events = [e for e in events if e.get("published")]
        if published_events:
            return published_events[0]["event_id"]
    pytest.skip("No published events found for testing")


# ============= ANALYTICS TESTS (Period Filter) =============

class TestOrganizerAnalytics:
    """Test Analytics endpoint with period filters"""
    
    def test_analytics_default_all_period(self, organizer_client):
        """Test analytics endpoint with default 'all' period"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "overview" in data, "Response missing 'overview'"
        assert "events" in data, "Response missing 'events'"
        assert "monthly_trend" in data, "Response missing 'monthly_trend'"
        
        # Verify overview KPIs
        overview = data["overview"]
        assert "total_events" in overview, "Overview missing total_events"
        assert "total_registrations" in overview, "Overview missing total_registrations"
        assert "total_revenue" in overview, "Overview missing total_revenue"
        assert "shop_revenue" in overview, "Overview missing shop_revenue"
        assert "checked_in" in overview, "Overview missing checked_in"
        assert "checkin_rate" in overview, "Overview missing checkin_rate"
        
        print(f"✓ Analytics default (all): {overview['total_events']} events, {overview['total_registrations']} registrations, {overview['total_revenue']}€ revenue")
    
    def test_analytics_period_30d(self, organizer_client):
        """Test analytics endpoint with 30 days filter"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/analytics?period=30d")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "overview" in data
        print(f"✓ Analytics 30d: {data['overview']['total_registrations']} registrations in last 30 days")
    
    def test_analytics_period_90d(self, organizer_client):
        """Test analytics endpoint with 90 days filter"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/analytics?period=90d")
        assert response.status_code == 200
        
        data = response.json()
        assert "overview" in data
        print(f"✓ Analytics 90d: {data['overview']['total_registrations']} registrations in last 90 days")
    
    def test_analytics_period_365d(self, organizer_client):
        """Test analytics endpoint with 1 year filter"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/analytics?period=365d")
        assert response.status_code == 200
        
        data = response.json()
        assert "overview" in data
        print(f"✓ Analytics 365d: {data['overview']['total_registrations']} registrations in last year")
    
    def test_analytics_returns_events_breakdown(self, organizer_client):
        """Test that analytics returns per-event breakdown"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/analytics")
        assert response.status_code == 200
        
        data = response.json()
        events = data.get("events", [])
        
        # Each event should have these fields
        if events:
            event = events[0]
            assert "event_id" in event, "Event missing event_id"
            assert "title" in event, "Event missing title"
            assert "registrations" in event, "Event missing registrations"
            assert "revenue" in event, "Event missing revenue"
            assert "checkin_rate" in event, "Event missing checkin_rate"
            
        print(f"✓ Analytics returns {len(events)} events with breakdown data")
    
    def test_analytics_returns_monthly_trend(self, organizer_client):
        """Test that analytics returns monthly trend for charts"""
        response = organizer_client.get(f"{BASE_URL}/api/organizer/analytics")
        assert response.status_code == 200
        
        data = response.json()
        monthly = data.get("monthly_trend", [])
        
        # Each month entry should have these fields (if data exists)
        if monthly:
            month = monthly[0]
            assert "month" in month, "Monthly data missing month key"
            assert "registrations" in month, "Monthly data missing registrations"
            assert "revenue" in month, "Monthly data missing revenue"
            
        print(f"✓ Analytics returns {len(monthly)} months of trend data")
    
    def test_analytics_unauthorized_without_token(self, api_client):
        """Test that analytics requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/organizer/analytics")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Analytics endpoint correctly requires authentication")


# ============= COMMUNITY TESTS (Pagination) =============

class TestCommunityPagination:
    """Test Community endpoint with pagination"""
    
    def test_community_posts_default_page(self, api_client, test_event_id):
        """Test fetching community posts with default pagination"""
        response = api_client.get(f"{BASE_URL}/api/events/{test_event_id}/community")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "posts" in data, "Response missing 'posts'"
        assert "total" in data, "Response missing 'total'"
        assert "page" in data, "Response missing 'page'"
        
        print(f"✓ Community default page: {len(data['posts'])} posts, {data['total']} total, page {data['page']}")
    
    def test_community_posts_with_page_param(self, api_client, test_event_id):
        """Test fetching community posts with explicit page parameter"""
        response = api_client.get(f"{BASE_URL}/api/events/{test_event_id}/community?page=1&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1, f"Expected page 1, got {data['page']}"
        assert len(data["posts"]) <= 10, "More posts than limit"
        
        print(f"✓ Community page 1 limit 10: {len(data['posts'])} posts returned")
    
    def test_community_posts_page_2(self, api_client, test_event_id):
        """Test fetching second page of community posts"""
        response = api_client.get(f"{BASE_URL}/api/events/{test_event_id}/community?page=2&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 2, f"Expected page 2, got {data['page']}"
        
        print(f"✓ Community page 2: {len(data['posts'])} posts returned")
    
    def test_community_post_create(self, organizer_client, test_event_id):
        """Test creating a community post"""
        unique_content = f"TEST_Community post {uuid.uuid4().hex[:8]} at {datetime.now().isoformat()}"
        response = organizer_client.post(
            f"{BASE_URL}/api/events/{test_event_id}/community",
            json={"content": unique_content}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "post" in data, "Response missing 'post'"
        post = data["post"]
        assert post["content"] == unique_content, "Post content mismatch"
        assert "post_id" in post, "Post missing post_id"
        assert "author_name" in post, "Post missing author_name"
        
        print(f"✓ Created community post: {post['post_id']}")
        return post["post_id"]
    
    def test_community_post_like(self, organizer_client, test_event_id):
        """Test liking a community post"""
        # First get posts
        response = organizer_client.get(f"{BASE_URL}/api/events/{test_event_id}/community")
        data = response.json()
        
        if not data["posts"]:
            pytest.skip("No posts to like")
        
        post_id = data["posts"][0]["post_id"]
        
        # Toggle like
        response = organizer_client.post(f"{BASE_URL}/api/community/posts/{post_id}/like")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        like_data = response.json()
        assert "liked" in like_data, "Response missing 'liked'"
        
        print(f"✓ Toggled like on post {post_id}: liked={like_data['liked']}")
    
    def test_community_post_replies(self, organizer_client, test_event_id):
        """Test fetching and creating replies on a post"""
        # Get posts
        response = organizer_client.get(f"{BASE_URL}/api/events/{test_event_id}/community")
        data = response.json()
        
        if not data["posts"]:
            pytest.skip("No posts to reply to")
        
        post_id = data["posts"][0]["post_id"]
        
        # Get replies
        response = organizer_client.get(f"{BASE_URL}/api/community/posts/{post_id}/replies")
        assert response.status_code == 200
        
        replies_data = response.json()
        assert "replies" in replies_data, "Response missing 'replies'"
        
        print(f"✓ Post {post_id} has {len(replies_data['replies'])} replies")
    
    def test_community_create_reply(self, organizer_client, test_event_id):
        """Test creating a reply to a community post"""
        # Get posts
        response = organizer_client.get(f"{BASE_URL}/api/events/{test_event_id}/community")
        data = response.json()
        
        if not data["posts"]:
            pytest.skip("No posts to reply to")
        
        post_id = data["posts"][0]["post_id"]
        
        # Create reply
        unique_reply = f"TEST_Reply {uuid.uuid4().hex[:8]}"
        response = organizer_client.post(
            f"{BASE_URL}/api/community/posts/{post_id}/replies",
            json={"content": unique_reply}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        reply_data = response.json()
        assert "reply" in reply_data, "Response missing 'reply'"
        
        print(f"✓ Created reply on post {post_id}")


# ============= REFUNDS ADMIN TESTS (Status Filter) =============

class TestRefundsAdmin:
    """Test Admin Refunds endpoint with status filters"""
    
    def test_refunds_all_no_filter(self, admin_client):
        """Test fetching all refund requests without filter"""
        response = admin_client.get(f"{BASE_URL}/api/admin/refunds/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "refunds" in data, "Response missing 'refunds'"
        assert "stats" in data, "Response missing 'stats'"
        
        stats = data["stats"]
        assert "total" in stats, "Stats missing 'total'"
        assert "pending" in stats, "Stats missing 'pending'"
        assert "approved" in stats, "Stats missing 'approved'"
        assert "rejected" in stats, "Stats missing 'rejected'"
        
        print(f"✓ Refunds all: {len(data['refunds'])} refunds, stats: pending={stats['pending']}, approved={stats['approved']}, rejected={stats['rejected']}")
    
    def test_refunds_filter_pending(self, admin_client):
        """Test fetching only pending refund requests"""
        response = admin_client.get(f"{BASE_URL}/api/admin/refunds/all?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        refunds = data.get("refunds", [])
        
        # All returned refunds should be pending
        for refund in refunds:
            assert refund["status"] == "pending", f"Expected pending, got {refund['status']}"
        
        print(f"✓ Refunds filter pending: {len(refunds)} pending requests")
    
    def test_refunds_filter_approved(self, admin_client):
        """Test fetching only approved refund requests"""
        response = admin_client.get(f"{BASE_URL}/api/admin/refunds/all?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        refunds = data.get("refunds", [])
        
        # All returned refunds should be approved
        for refund in refunds:
            assert refund["status"] == "approved", f"Expected approved, got {refund['status']}"
        
        print(f"✓ Refunds filter approved: {len(refunds)} approved requests")
    
    def test_refunds_filter_rejected(self, admin_client):
        """Test fetching only rejected refund requests"""
        response = admin_client.get(f"{BASE_URL}/api/admin/refunds/all?status=rejected")
        assert response.status_code == 200
        
        data = response.json()
        refunds = data.get("refunds", [])
        
        # All returned refunds should be rejected
        for refund in refunds:
            assert refund["status"] == "rejected", f"Expected rejected, got {refund['status']}"
        
        print(f"✓ Refunds filter rejected: {len(refunds)} rejected requests")
    
    def test_refunds_stats_include_totals(self, admin_client):
        """Test that stats include correct totals and amounts"""
        response = admin_client.get(f"{BASE_URL}/api/admin/refunds/all")
        assert response.status_code == 200
        
        data = response.json()
        stats = data["stats"]
        
        # Stats should include total_refunded amount
        assert "total_refunded" in stats, "Stats missing 'total_refunded'"
        assert isinstance(stats["total_refunded"], (int, float)), "total_refunded should be numeric"
        
        print(f"✓ Refunds stats: total={stats['total']}, total_refunded={stats['total_refunded']}€")
    
    def test_refunds_unauthorized_without_admin(self, organizer_client):
        """Test that refunds admin endpoint requires admin role"""
        response = organizer_client.get(f"{BASE_URL}/api/admin/refunds/all")
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Refunds admin endpoint correctly requires admin role")


# ============= CLEANUP =============

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_posts(self, organizer_client, test_event_id):
        """Clean up TEST_ prefixed community posts"""
        response = organizer_client.get(f"{BASE_URL}/api/events/{test_event_id}/community?limit=50")
        if response.status_code == 200:
            data = response.json()
            for post in data.get("posts", []):
                if post.get("content", "").startswith("TEST_"):
                    organizer_client.delete(f"{BASE_URL}/api/community/posts/{post['post_id']}")
        print("✓ Cleaned up test community posts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
