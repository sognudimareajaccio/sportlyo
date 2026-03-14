"""
Test suite for messaging API endpoints
Tests: conversations, messages, admin/organizer endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sporting-portal.preview.emergentagent.com')

class TestMessagingAPI:
    """Messaging system API tests"""
    
    admin_token = None
    organizer_token = None
    admin_user_id = None
    organizer_user_id = None
    test_conversation_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth tokens for admin and organizer"""
        # Login as admin
        admin_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sportsconnect.fr",
            "password": "admin123"
        })
        assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
        self.__class__.admin_token = admin_res.json()["token"]
        self.__class__.admin_user_id = admin_res.json()["user"]["user_id"]
        
        # Login as organizer
        org_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "club@paris-sport.fr",
            "password": "club123"
        })
        assert org_res.status_code == 200, f"Organizer login failed: {org_res.text}"
        self.__class__.organizer_token = org_res.json()["token"]
        self.__class__.organizer_user_id = org_res.json()["user"]["user_id"]
    
    def test_01_get_conversations_admin(self):
        """Admin can get conversations"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "conversations" in data
        print(f"✅ Admin has {len(data['conversations'])} conversation(s)")
    
    def test_02_get_conversations_organizer(self):
        """Organizer can get conversations"""
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        res = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "conversations" in data
        print(f"✅ Organizer has {len(data['conversations'])} conversation(s)")
    
    def test_03_admin_get_organizers_list(self):
        """Admin can get list of organizers for messaging"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = requests.get(f"{BASE_URL}/api/admin/organizers", headers=headers)
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "organizers" in data
        assert len(data["organizers"]) > 0, "No organizers found"
        print(f"✅ Found {len(data['organizers'])} organizer(s)")
        
        # Verify organizer data structure
        org = data["organizers"][0]
        assert "user_id" in org
        assert "name" in org
        assert "email" in org
    
    def test_04_organizer_get_admins_list(self):
        """Organizer can get list of admins for messaging"""
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        res = requests.get(f"{BASE_URL}/api/messaging/admins", headers=headers)
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "admins" in data
        assert len(data["admins"]) > 0, "No admins found"
        print(f"✅ Found {len(data['admins'])} admin(s)")
        
        # Verify admin data structure
        admin = data["admins"][0]
        assert "user_id" in admin
        assert "name" in admin
        assert "email" in admin
    
    def test_05_create_conversation(self):
        """Admin can create a new conversation with organizer"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = requests.post(f"{BASE_URL}/api/conversations", headers=headers, json={
            "target_user_id": self.organizer_user_id,
            "subject": "Test conversation from pytest"
        })
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "conversation" in data
        
        convo = data["conversation"]
        assert "conversation_id" in convo
        assert "participants" in convo
        assert self.admin_user_id in convo["participants"]
        assert self.organizer_user_id in convo["participants"]
        
        self.__class__.test_conversation_id = convo["conversation_id"]
        print(f"✅ Created/found conversation: {self.test_conversation_id}")
    
    def test_06_send_message(self):
        """Admin can send a message in conversation"""
        if not self.test_conversation_id:
            pytest.skip("No conversation created")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = requests.post(
            f"{BASE_URL}/api/conversations/{self.test_conversation_id}/messages",
            headers=headers,
            json={"content": "Hello from pytest test!"}
        )
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "message" in data
        
        msg = data["message"]
        assert "message_id" in msg
        assert msg["content"] == "Hello from pytest test!"
        assert msg["sender_id"] == self.admin_user_id
        print(f"✅ Message sent: {msg['message_id']}")
    
    def test_07_get_messages(self):
        """Organizer can get messages from conversation"""
        if not self.test_conversation_id:
            pytest.skip("No conversation created")
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        res = requests.get(
            f"{BASE_URL}/api/conversations/{self.test_conversation_id}/messages",
            headers=headers
        )
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "messages" in data
        assert "conversation" in data
        
        # Should have at least the message we sent
        assert len(data["messages"]) >= 1, "No messages found"
        print(f"✅ Found {len(data['messages'])} message(s)")
    
    def test_08_get_unread_count(self):
        """Organizer can get unread message count"""
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        res = requests.get(f"{BASE_URL}/api/conversations/unread-count", headers=headers)
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "unread_count" in data
        print(f"✅ Organizer has {data['unread_count']} unread message(s)")
    
    def test_09_organizer_reply(self):
        """Organizer can reply in conversation"""
        if not self.test_conversation_id:
            pytest.skip("No conversation created")
        
        headers = {"Authorization": f"Bearer {self.organizer_token}"}
        res = requests.post(
            f"{BASE_URL}/api/conversations/{self.test_conversation_id}/messages",
            headers=headers,
            json={"content": "Reply from organizer!"}
        )
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "message" in data
        assert data["message"]["sender_id"] == self.organizer_user_id
        print(f"✅ Organizer replied successfully")
    
    def test_10_unauthorized_access(self):
        """Unauthenticated user cannot access conversations"""
        res = requests.get(f"{BASE_URL}/api/conversations")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("✅ Unauthenticated access blocked")
    
    def test_11_participant_only_access(self):
        """Non-participant cannot access conversation"""
        # Login as participant (not part of admin-organizer conversation)
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pierre@test.com",
            "password": "test1234"
        })
        
        if login_res.status_code != 200:
            pytest.skip("Participant login failed")
        
        participant_token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {participant_token}"}
        
        if self.test_conversation_id:
            res = requests.get(
                f"{BASE_URL}/api/conversations/{self.test_conversation_id}/messages",
                headers=headers
            )
            assert res.status_code == 403, f"Expected 403, got {res.status_code}"
            print("✅ Non-participant access blocked")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
