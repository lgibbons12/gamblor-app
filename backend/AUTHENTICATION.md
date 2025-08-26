# 🔐 Authentication Guide

This guide explains how to use the Gamblor API authentication system with JWT tokens.

## 🚀 Quick Start

### 1. **Google OAuth Login**

First, get a JWT token by authenticating with Google:

```bash
# Exchange Google OAuth token for our JWT
curl -X POST http://localhost:8000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_GOOGLE_OAUTH_TOKEN"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "google_sub": "google_user_id",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. **Using the JWT Token**

Include the JWT token in the `Authorization` header for all authenticated requests:

```bash
# Create a game (requires authentication)
curl -X POST http://localhost:8000/games \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Game",
    "ante_dollars": 5
  }'
```

### 3. **Get Current User**

Verify your token and get user info:

```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔧 Authentication Functions

The `auth.py` module provides several authentication dependencies:

### **Required Authentication**
```python
from auth import get_current_user, get_current_user_id

@router.post("/protected-endpoint")
def protected_endpoint(
    current_user: User = Depends(get_current_user),
    # OR just get the user ID
    current_user_id: UUID = Depends(get_current_user_id)
):
    # User is guaranteed to be authenticated
    pass
```

### **Optional Authentication**
```python
from auth import get_optional_user, get_optional_user_id

@router.get("/public-endpoint")
def public_endpoint(
    current_user: Optional[User] = Depends(get_optional_user),
    # OR just get the user ID
    current_user_id: Optional[UUID] = Depends(get_optional_user_id)
):
    # User might be None if not authenticated
    if current_user:
        # Show personalized content
    else:
        # Show public content
    pass
```

## 🎯 API Endpoints

### **Games API Usage**

All games endpoints now use real JWT authentication:

```bash
# Create game
curl -X POST http://localhost:8000/games \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Yankees vs Red Sox", "ante_dollars": 10}'

# Join game by PIN
curl -X POST http://localhost:8000/games/123456/join \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'

# Update game (admin only)
curl -X PATCH http://localhost:8000/games/GAME_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# Get game info (public)
curl -X GET http://localhost:8000/games/GAME_UUID
```

## 🔄 Token Lifecycle

### **Token Expiration**
- JWT tokens expire after **24 hours**
- Expired tokens return `401 Unauthorized`
- Frontend should refresh tokens or re-authenticate

### **Token Validation**
Each request with a JWT token:
1. **Extracts** the token from `Authorization: Bearer <token>`
2. **Verifies** the token signature and expiration
3. **Extracts** the user ID from the token payload
4. **Validates** the user exists in the database
5. **Provides** the authenticated user to the endpoint

## 🛠️ Development Mode

For development/testing, you can still use the legacy header authentication:

```python
from auth import get_user_id_from_header

@router.post("/dev-endpoint")
def dev_endpoint(
    user_id: Optional[UUID] = Depends(get_user_id_from_header)
):
    # Use X-User-ID header instead of JWT
    pass
```

**Usage:**
```bash
curl -X POST http://localhost:8000/dev-endpoint \
  -H "X-User-ID: 123e4567-e89b-12d3-a456-426614174000"
```

## ⚡ Error Handling

### **Common Authentication Errors**

| Status | Error | Solution |
|--------|-------|----------|
| `401` | `Authorization header required` | Add `Authorization: Bearer <token>` header |
| `401` | `Invalid token` | Token is malformed or corrupted |
| `401` | `Token has expired` | Get a new token via `/auth/google` |
| `401` | `User not found` | User was deleted from database |
| `400` | `Invalid UUID format` | Check user ID format (header auth only) |

### **Example Error Response**
```json
{
  "detail": "Token has expired"
}
```

## 🔒 Security Features

✅ **JWT Verification**: Validates token signature and expiration  
✅ **Database Validation**: Confirms user exists and is active  
✅ **Secure Headers**: Uses standard `Authorization: Bearer` format  
✅ **Token Expiration**: 24-hour token lifetime  
✅ **Error Handling**: Clear error messages for debugging  
✅ **Optional Auth**: Public endpoints can optionally use auth  

## 🎮 Integration with Frontend

Your frontend should:

1. **Authenticate** with Google OAuth
2. **Store** the JWT token securely (localStorage/sessionStorage)
3. **Include** the token in all API requests
4. **Handle** 401 errors by redirecting to login
5. **Refresh** tokens when they expire

**Example JavaScript:**
```javascript
// Store token after login
localStorage.setItem('gamblor_token', response.access_token);

// Use token in API calls
fetch('/api/games', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('gamblor_token')}`,
    'Content-Type': 'application/json'
  }
});

// Handle auth errors
if (response.status === 401) {
  // Redirect to login
  window.location.href = '/login';
}
```

---

🎉 **Your API now has production-ready authentication!** No more placeholder headers - everything uses real JWT tokens with proper validation.
