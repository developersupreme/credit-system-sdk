# Debugging Iframe Authentication

## How to Enable Debug Mode

In your embedded application, initialize the SDK with debug logging:

```javascript
import { CreditSystem } from 'credit-system-sdk';

// Enable debug logging
const creditSystem = new CreditSystem({
    apiUrl: 'http://your-api-url/api/secure-credits',
    parentOrigin: 'http://your-parent-domain.com', // Optional but recommended for security
});

// Set log level to debug
creditSystem.setLogLevel('debug');

// Initialize and check status
await creditSystem.init();

console.log('Is in iframe?', creditSystem.isInIframe());
console.log('Auth mode:', creditSystem.getAuthMode());
console.log('Is authenticated?', creditSystem.isAuthenticated());
```

## What to Look for in Console

When the SDK initializes correctly in iframe mode, you should see:

1. **On SDK initialization:**
```
[CreditSystem] CreditSystem configuration {isInIframe: true, finalAuthMode: "jwt", ...}
[AuthManager] Detected iframe environment, initializing iframe authentication
[AuthManager] Starting iframe authentication process
[AuthManager] Requesting credentials from parent window
```

2. **From parent window (in parent's console):**
```
[Parent] Generating JWT token for user: developer@supremeopti.com
[Parent] JWT token sent to child iframe
```

3. **Back in child iframe console:**
```
[AuthManager] Received message in iframe: {origin: "...", messageType: "JWT_TOKEN", hasToken: true}
[AuthManager] Token set successfully
[AuthManager] Iframe authentication successful {userId: 5}
[CreditSystem] CreditSystem initialized successfully
```

## Common Issues and Solutions

### Issue 1: "SDK asks for login even in iframe"

**Check:**
1. Open browser console in the embedded app
2. Look for: `CreditSystem configuration {isInIframe: ...}`
3. If `isInIframe: false`, the SDK isn't detecting iframe mode

**Solutions:**
- Ensure the app is actually running in an iframe
- Check for cross-origin restrictions
- Explicitly set `authMode: 'jwt'` in config

### Issue 2: "Timeout waiting for parent authentication"

**Check:**
1. Check parent window console for any errors
2. Verify parent origin matches what's configured
3. Check if `REQUEST_CREDENTIALS` message is being sent

**Solutions:**
- Remove or correct `parentOrigin` in SDK config
- Check CORS settings in parent application
- Verify parent is listening for messages

### Issue 3: "Invalid token data from parent"

**Check:**
1. Look at the message received from parent
2. Verify it has `token`, `user`, and `expiresAt` fields

**Solutions:**
- Update parent to send correct message format
- Check token generation endpoint

## Test Configuration

For testing, you can use this minimal configuration:

```javascript
// In your embedded app
const creditSystem = new CreditSystem({
    apiUrl: 'http://localhost:8000/api/secure-credits',
    // Don't specify parentOrigin for testing (accepts any origin)
    // parentOrigin: 'http://localhost:8000',
});

creditSystem.setLogLevel('debug');

await creditSystem.init();

// Check authentication status
if (creditSystem.isAuthenticated()) {
    console.log('✅ Authenticated via iframe');
    const user = creditSystem.getCurrentUser();
    console.log('User:', user);
} else {
    console.log('❌ Not authenticated - may need to login');
}
```

## Manual Testing

You can manually test the message passing:

1. **In parent window console:**
```javascript
// Manually send token to iframe
const iframe = document.getElementById('child-iframe');
iframe.contentWindow.postMessage({
    type: 'JWT_TOKEN',
    token: 'your-token-here',
    user: { id: 5, name: 'Test', email: 'test@example.com' },
    expiresAt: new Date(Date.now() + 3600000).toISOString()
}, '*');
```

2. **In iframe console:**
```javascript
// Manually request credentials
window.parent.postMessage({
    type: 'REQUEST_CREDENTIALS',
    source: 'credit-system-sdk'
}, '*');
```

## Verification Checklist

- [ ] SDK detects iframe mode (`isInIframe() === true`)
- [ ] Auth mode is set to 'jwt' (`getAuthMode() === 'jwt'`)
- [ ] Parent receives `REQUEST_CREDENTIALS` message
- [ ] Parent sends `JWT_TOKEN` message back
- [ ] SDK receives and processes the token
- [ ] `isAuthenticated()` returns true after init
- [ ] User data is available via `getCurrentUser()`
- [ ] Balance can be fetched without login