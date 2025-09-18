# Credit System SDK Usage Guide

## Installation

```bash
npm install credit-system-sdk
# or
yarn add credit-system-sdk
```

## Basic Usage

### JavaScript (CommonJS)
```javascript
const { CreditSystem } = require('credit-system-sdk');

const creditSystem = new CreditSystem({
  apiUrl: 'https://your-api-endpoint.com',
  apiKey: 'your-api-key'
});

// Use the credit system
creditSystem.getBalance(userId).then(balance => {
  console.log('Balance:', balance);
});
```

### JavaScript (ES Modules)
```javascript
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: 'https://your-api-endpoint.com',
  apiKey: 'your-api-key'
});

// Use the credit system
const balance = await creditSystem.getBalance(userId);
console.log('Balance:', balance);
```

### TypeScript
```typescript
import { CreditSystem } from 'credit-system-sdk';
import type { CreditSystemConfig } from 'credit-system-sdk';

const config: CreditSystemConfig = {
  apiUrl: 'https://your-api-endpoint.com',
  apiKey: 'your-api-key'
};

const creditSystem = new CreditSystem(config);

// Use with full type support
const balance = await creditSystem.getBalance(userId);
```

## Framework-Specific Usage

### React
```jsx
import React, { useState, useEffect } from 'react';
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: process.env.REACT_APP_API_URL,
  apiKey: process.env.REACT_APP_API_KEY
});

function CreditBalance({ userId }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    creditSystem.getBalance(userId)
      .then(setBalance)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>Balance: {balance}</div>;
}

export default CreditBalance;
```

### React with Custom Hook
```jsx
import { useState, useEffect } from 'react';
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: process.env.REACT_APP_API_URL,
  apiKey: process.env.REACT_APP_API_KEY
});

export function useCreditBalance(userId) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    creditSystem.getBalance(userId)
      .then(setBalance)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { balance, loading, error };
}
```

### Angular
```typescript
// credit.service.ts
import { Injectable } from '@angular/core';
import { CreditSystem } from 'credit-system-sdk';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private creditSystem: CreditSystem;

  constructor() {
    this.creditSystem = new CreditSystem({
      apiUrl: environment.apiUrl,
      apiKey: environment.apiKey
    });
  }

  getBalance(userId: string): Observable<number> {
    return from(this.creditSystem.getBalance(userId));
  }

  addCredits(userId: string, amount: number): Observable<any> {
    return from(this.creditSystem.addCredits(userId, amount));
  }
}

// component.ts
import { Component, OnInit } from '@angular/core';
import { CreditService } from './credit.service';

@Component({
  selector: 'app-credit-balance',
  template: `<div>Balance: {{ balance }}</div>`
})
export class CreditBalanceComponent implements OnInit {
  balance: number = 0;

  constructor(private creditService: CreditService) {}

  ngOnInit() {
    this.creditService.getBalance('user123').subscribe(
      balance => this.balance = balance
    );
  }
}
```

### Vue 3
```vue
<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else>Balance: {{ balance }}</p>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { CreditSystem } from 'credit-system-sdk';

export default {
  props: ['userId'],
  setup(props) {
    const balance = ref(0);
    const loading = ref(true);

    const creditSystem = new CreditSystem({
      apiUrl: import.meta.env.VITE_API_URL,
      apiKey: import.meta.env.VITE_API_KEY
    });

    onMounted(async () => {
      try {
        balance.value = await creditSystem.getBalance(props.userId);
      } finally {
        loading.value = false;
      }
    });

    return { balance, loading };
  }
};
</script>
```

### Vue 2
```vue
<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else>Balance: {{ balance }}</p>
  </div>
</template>

<script>
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: process.env.VUE_APP_API_URL,
  apiKey: process.env.VUE_APP_API_KEY
});

export default {
  props: ['userId'],
  data() {
    return {
      balance: 0,
      loading: true
    };
  },
  async mounted() {
    try {
      this.balance = await creditSystem.getBalance(this.userId);
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

### Next.js
```jsx
// pages/api/credit.js
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY
});

export default async function handler(req, res) {
  const { userId } = req.query;

  try {
    const balance = await creditSystem.getBalance(userId);
    res.status(200).json({ balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// components/CreditBalance.jsx
import { useState, useEffect } from 'react';

export default function CreditBalance({ userId }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/credit?userId=${userId}`)
      .then(res => res.json())
      .then(data => setBalance(data.balance))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>Balance: {balance}</div>;
}
```

### Node.js / Express
```javascript
const express = require('express');
const { CreditSystem } = require('credit-system-sdk');

const app = express();
const creditSystem = new CreditSystem({
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY
});

app.get('/balance/:userId', async (req, res) => {
  try {
    const balance = await creditSystem.getBalance(req.params.userId);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Available Methods

- `getBalance(userId)`: Get user's credit balance
- `addCredits(userId, amount)`: Add credits to user account
- `deductCredits(userId, amount)`: Deduct credits from user account
- `transferCredits(fromUserId, toUserId, amount)`: Transfer credits between users
- `getTransactionHistory(userId)`: Get user's transaction history
- `validateTransaction(transactionId)`: Validate a transaction

## Error Handling

```javascript
import { CreditSystem, CreditError, ErrorCode } from 'credit-system-sdk';

try {
  const balance = await creditSystem.getBalance(userId);
} catch (error) {
  if (error instanceof CreditError) {
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_CREDITS:
        console.error('Not enough credits');
        break;
      case ErrorCode.USER_NOT_FOUND:
        console.error('User not found');
        break;
      default:
        console.error('Credit system error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## TypeScript Support

The SDK is fully typed and provides TypeScript definitions out of the box.

```typescript
import {
  CreditSystem,
  CreditSystemConfig,
  Transaction,
  User,
  ErrorCode
} from 'credit-system-sdk';
```