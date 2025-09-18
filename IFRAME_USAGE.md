# Credit System SDK - Iframe Integration Guide

## Overview
The Credit System SDK now supports both **standalone** and **embedded (iframe)** modes automatically. When the SDK detects it's running inside an iframe, it will automatically switch to JWT authentication mode and wait for the parent window to send authentication credentials.

## Key Changes

### 1. Automatic Mode Detection
The SDK now automatically detects if it's running in an iframe and adjusts its behavior accordingly:
- **Standalone Mode**: Used when running directly in a browser window
- **Iframe Mode**: Automatically activated when running inside an iframe

### 2. Updated API Endpoints
- **Login**: `/standalone/auth`
- **Token Validation**: `/standalone/validate`
- **Token Refresh**: `/standalone/refresh-token`

## Parent Page Configuration (iframe-parent.blade.php)

Your parent page should send the JWT token to the iframe when requested:

```javascript
// Listen for credential requests from iframe
window.addEventListener('message', function(event) {
    // Verify the origin of the request
    if (event.origin !== 'https://your-iframe-domain.com') {
        return;
    }

    if (event.data.type === 'REQUEST_CREDENTIALS') {
        // Get the current user's token (from Laravel session, localStorage, etc.)
        const token = '{{ $token }}'; // Your JWT token
        const user = {
            id: {{ $user->id }},
            name: '{{ $user->name }}',
            email: '{{ $user->email }}'
        };
        const expiresAt = '{{ $expiresAt }}'; // Token expiration timestamp

        // Send credentials to iframe
        event.source.postMessage({
            type: 'JWT_TOKEN',
            token: token,
            user: user,
            expiresAt: expiresAt
        }, event.origin);
    }
});
```

## Iframe Application Configuration

### Basic Setup (Auto-detection)
```javascript
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
    apiUrl: 'https://api.example.com/api/secure-credits',
    // authMode is automatically detected, but can be explicitly set
    // authMode: 'jwt', // Optional: explicitly set to 'jwt' for iframe mode
    parentOrigin: 'https://parent-domain.com', // Required for security
    onAuthenticated: (user) => {
        console.log('User authenticated:', user);
    },
    onBalanceChanged: (balance) => {
        console.log('Balance updated:', balance);
    }
});

// Initialize the system - it will automatically handle iframe authentication
await creditSystem.init();

// Check if authenticated (will be true if parent sent valid token)
if (creditSystem.isAuthenticated()) {
    const user = creditSystem.getCurrentUser();
    const balance = await creditSystem.getBalance();
    console.log('User:', user, 'Balance:', balance);
}
```

### React Example
```jsx
import React, { useEffect, useState } from 'react';
import { CreditSystem } from 'credit-system-sdk';

function CreditWidget() {
    const [creditSystem, setCreditSystem] = useState(null);
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        const initCreditSystem = async () => {
            const cs = new CreditSystem({
                apiUrl: process.env.REACT_APP_API_URL,
                parentOrigin: process.env.REACT_APP_PARENT_ORIGIN,
                onAuthenticated: (user) => {
                    setUser(user);
                },
                onBalanceChanged: (balance) => {
                    setBalance(balance);
                }
            });

            await cs.init();
            setCreditSystem(cs);

            // If authenticated via iframe, get initial balance
            if (cs.isAuthenticated()) {
                const currentUser = cs.getCurrentUser();
                setUser(currentUser);
                const currentBalance = await cs.getBalance();
                setBalance(currentBalance);
            }
        };

        initCreditSystem();
    }, []);

    if (!user) {
        return <div>Authenticating...</div>;
    }

    return (
        <div>
            <h3>Welcome, {user.name}</h3>
            <p>Your balance: {balance} credits</p>
        </div>
    );
}
```

## Security Considerations

1. **Always specify `parentOrigin`**: This ensures the SDK only accepts messages from your trusted parent domain.
2. **Use HTTPS**: Both parent and iframe should be served over HTTPS.
3. **Validate tokens server-side**: The SDK will validate tokens with your backend API.

## Troubleshooting

### Issue: "Timeout waiting for parent authentication"
- **Cause**: Parent window is not sending JWT token
- **Solution**: Ensure parent page has the message listener configured correctly

### Issue: "Invalid token data from parent"
- **Cause**: Token format is incorrect
- **Solution**: Ensure the message includes `token`, `user`, and `expiresAt` fields

### Issue: Authentication works but balance is not loading
- **Cause**: API endpoints may not be configured correctly
- **Solution**: Verify your API base URL includes the correct path (e.g., `/api/secure-credits`)

## Mode Comparison

| Feature | Standalone Mode | Iframe Mode |
|---------|----------------|-------------|
| Authentication | Email/Password login | JWT token from parent |
| Token Management | SDK handles refresh | Parent handles refresh |
| User Experience | Login form required | Seamless SSO |
| Security | Standard auth flow | Parent-child trust |

## API Response Format

The SDK now expects authentication responses in this format:
```json
{
    "success": true,
    "token": "your-jwt-token",
    "expires_at": "2025-09-18T20:31:20.000000Z",
    "user": {
        "id": 5,
        "name": "developer",
        "email": "developer@example.com"
    }
}
```

Note: The response data is no longer wrapped in a `data` property.