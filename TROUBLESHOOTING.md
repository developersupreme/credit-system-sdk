# SDK Iframe Authentication Troubleshooting Guide

## Console Logs to Check

When you run your embedded application, open the browser console (F12) and look for these specific log messages:

### 1. On SDK Initialization
You should see these logs in order:

```
[SDK-CreditSystem] Constructor called with config: {...}
[SDK-CreditSystem] normalizeConfig() called
[SDK-CreditSystem] Iframe detection in normalizeConfig: {typeof window: "object", window.self: Window, window.top: Window, isInIframe: true/false}
[SDK-CreditSystem] Auth mode decision: {isInIframe: true, finalAuthMode: "jwt", ...}
[SDK-CreditSystem] Normalized config: {...}
[SDK-CreditSystem] CreditSystem instance created
```

### 2. When calling creditSystem.init()
```
[SDK-CreditSystem] init() called {alreadyInitialized: false, authMode: "jwt"}
[SDK-CreditSystem] Calling authManager.init()...
[SDK-AuthManager] init() called {isInitialized: false, authMode: "jwt", parentOrigin: "..."}
[SDK-AuthManager] isInIframe() check: {window.self: Window, window.top: Window, window.self !== window.top: true, ...}
[SDK-AuthManager] Iframe check result: true
[SDK-AuthManager] Auth mode check: {configAuthMode: "jwt", isJWT: true, willUseIframeAuth: true}
[SDK-AuthManager] Starting iframe authentication...
[SDK-AuthManager] initIframeAuth() started
[SDK-AuthManager] Setting up message listener and timeout
[SDK-AuthManager] Message listener attached
[SDK-AuthManager] Sending credential request to parent: {message: {type: "REQUEST_CREDENTIALS", source: "credit-system-sdk"}, targetOrigin: "*", ...}
[SDK-AuthManager] Credential request sent, waiting for response...
```

### 3. When parent sends JWT token
```
[SDK-AuthManager] Message received: {origin: "http://parent-domain", data: {...}, dataType: "JWT_TOKEN", hasToken: true, hasUser: true}
[SDK-AuthManager] Iframe authentication completed successfully
[SDK-CreditSystem] authManager.init() completed
[SDK-CreditSystem] Post-init auth check: {isAuthenticated: true, hasUser: true, userId: 5}
[SDK-CreditSystem] Initialization complete
```

## What to Check if Authentication Fails

### ❌ If you see: `isInIframe: false`
**Problem:** SDK doesn't detect it's in an iframe
**Check:**
- Is the app actually running inside an iframe?
- Try explicitly setting `authMode: 'jwt'` in config

### ❌ If you see: `willUseIframeAuth: false`
**Problem:** SDK detected iframe but not using JWT mode
**Check:**
- What's the `authMode` value in config?
- What's the final `authMode` in the logs?

### ❌ If you see: `TIMEOUT: No response from parent after 10 seconds`
**Problem:** Parent isn't responding to credential request
**Check parent console for:**
- Is parent receiving the `REQUEST_CREDENTIALS` message?
- Check if `[Parent] Generating JWT token for user:` appears
- Check if `[Parent] JWT token sent to child iframe` appears

### ❌ If you see: `Not using iframe auth. Reason: {inIframe: false, authMode: "standalone"}`
**Problem:** SDK is using standalone mode
**Solution:** Explicitly set `authMode: 'jwt'` when initializing:
```javascript
const creditSystem = new CreditSystem({
    apiUrl: 'http://your-api/api/secure-credits',
    authMode: 'jwt',  // Force JWT mode
    parentOrigin: 'http://parent-domain'
});
```

## Quick Debug Code

Add this to your embedded app to see what's happening:

```javascript
// In your embedded app's initialization
const creditSystem = new CreditSystem({
    apiUrl: 'http://localhost:8000/api/secure-credits',
    authMode: 'jwt',  // Force JWT mode for testing
    // parentOrigin: 'http://localhost:8000'  // Optional
});

// Enable debug logging
creditSystem.setLogLevel('debug');

console.log('=== BEFORE INIT ===');
console.log('Window check:', {
    'in iframe?': window.self !== window.top,
    'has parent?': window.parent !== window
});

await creditSystem.init();

console.log('=== AFTER INIT ===');
console.log('SDK Status:', {
    'isInIframe': creditSystem.isInIframe(),
    'authMode': creditSystem.getAuthMode(),
    'isAuthenticated': creditSystem.isAuthenticated(),
    'currentUser': creditSystem.getCurrentUser()
});
```

## Expected Console Output Flow

1. **Child iframe console:**
   - SDK detects iframe environment
   - Sends REQUEST_CREDENTIALS to parent
   - Waits for response...

2. **Parent window console:**
   - Receives REQUEST_CREDENTIALS
   - Generates JWT token
   - Sends JWT_TOKEN back to child

3. **Child iframe console:**
   - Receives JWT_TOKEN message
   - Sets authentication
   - Completes initialization

## Common Fixes

1. **Force JWT mode:** Add `authMode: 'jwt'` to config
2. **Remove parentOrigin restriction:** Don't set `parentOrigin` initially for testing
3. **Check CORS:** Ensure parent's CORS_ALLOWED_ORIGINS includes child's origin
4. **Check parent auth:** Ensure user is logged in on parent page

The new console logs will show you exactly where the authentication process is failing.