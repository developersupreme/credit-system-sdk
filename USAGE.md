# Credit System SDK Usage Guide

## Installation

```bash
npm install credit-system-sdk
# or
yarn add credit-system-sdk
# or install directly from GitHub
npm install developersupreme/credit-system-sdk
```

## Basic Usage with Authentication

### JavaScript (CommonJS)
```javascript
const { CreditSystem } = require('credit-system-sdk');

const creditSystem = new CreditSystem({
  apiUrl: 'https://your-api-endpoint.com',
  authMode: 'standalone' // or 'jwt' for iframe mode
});

// Initialize the system
await creditSystem.init();

// Login with credentials
const user = await creditSystem.login({
  email: 'user@example.com',
  password: 'your-password'
});

console.log('Logged in as:', user.name);

// Get the user's credit balance
const balance = await creditSystem.getBalance();
console.log('Credit Balance:', balance);

// Spend credits
const transaction = await creditSystem.spend(10, 'API usage');
console.log('Transaction:', transaction);

// Check updated balance
const newBalance = await creditSystem.getBalance();
console.log('Updated Balance:', newBalance);

// Logout when done
creditSystem.logout();
```

### JavaScript (ES Modules)
```javascript
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: 'https://your-api-endpoint.com',
  authMode: 'standalone'
});

// Initialize and login
await creditSystem.init();

const user = await creditSystem.login({
  email: 'user@example.com',
  password: 'your-password'
});

// Get and display balance
const balance = await creditSystem.getBalance();
console.log(`${user.name}'s Credit Balance: ${balance}`);

// Spend credits
await creditSystem.spend(5, 'Feature usage');

// Get transaction history
const history = await creditSystem.getTransactionHistory();
console.log('Recent transactions:', history);
```

### TypeScript with Full Authentication
```typescript
import { CreditSystem } from 'credit-system-sdk';
import type {
  CreditSystemConfig,
  AuthCredentials,
  User,
  Transaction
} from 'credit-system-sdk';

const config: CreditSystemConfig = {
  apiUrl: 'https://your-api-endpoint.com',
  authMode: 'standalone',
  autoRefreshToken: true, // Auto-refresh JWT tokens
  onBalanceUpdate: (balance) => {
    console.log('Balance updated:', balance);
  },
  onError: (error) => {
    console.error('Credit system error:', error);
  }
};

const creditSystem = new CreditSystem(config);

// Login function with error handling
async function loginAndShowBalance() {
  try {
    // Initialize the system
    await creditSystem.init();

    // Login credentials
    const credentials: AuthCredentials = {
      email: 'user@example.com',
      password: 'your-password'
    };

    // Authenticate user
    const user: User = await creditSystem.login(credentials);
    console.log(`Welcome ${user.name}!`);

    // Get credit balance
    const balance: number = await creditSystem.getBalance();
    console.log(`Your credit balance: ${balance} credits`);

    // Check if user has enough credits before spending
    if (await creditSystem.hasSufficientCredits(10)) {
      const transaction: Transaction = await creditSystem.spend(10, 'Premium feature');
      console.log('Transaction successful:', transaction.id);
    } else {
      console.log('Insufficient credits');
    }

  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

loginAndShowBalance();
```

## Framework-Specific Usage

### React with Authentication and Balance Display
```jsx
import React, { useState, useEffect } from 'react';
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: process.env.REACT_APP_API_URL,
  authMode: 'standalone'
});

function CreditDashboard() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Initialize credit system on mount
  useEffect(() => {
    creditSystem.init().catch(console.error);
  }, []);

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loggedInUser = await creditSystem.login({ email, password });
      setUser(loggedInUser);

      // Get balance after login
      const userBalance = await creditSystem.getBalance();
      setBalance(userBalance);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    creditSystem.logout();
    setUser(null);
    setBalance(0);
  };

  // Spend credits
  const handleSpend = async (amount) => {
    try {
      await creditSystem.spend(amount, 'Feature usage');
      const newBalance = await creditSystem.getBalance();
      setBalance(newBalance);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user) {
    return (
      <div className="login-form">
        <h2>Login to Credit System</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="credit-dashboard">
      <h2>Welcome, {user.name}!</h2>
      <div className="balance">
        <h3>Credit Balance: {balance}</h3>
      </div>
      <div className="actions">
        <button onClick={() => handleSpend(10)}>Spend 10 Credits</button>
        <button onClick={() => handleSpend(25)}>Spend 25 Credits</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default CreditDashboard;
```

### React Custom Hook with Authentication
```jsx
import { useState, useEffect, useCallback } from 'react';
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: process.env.REACT_APP_API_URL,
  authMode: 'standalone',
  autoRefreshToken: true
});

export function useCreditSystem() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize on mount
  useEffect(() => {
    creditSystem.init()
      .then(() => {
        // Check if already authenticated (e.g., stored token)
        if (creditSystem.isAuthenticated()) {
          const currentUser = creditSystem.getUser();
          setUser(currentUser);
          setIsAuthenticated(true);
          return creditSystem.getBalance();
        }
      })
      .then((balance) => {
        if (balance !== undefined) setBalance(balance);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await creditSystem.login({ email, password });
      setUser(loggedInUser);
      setIsAuthenticated(true);
      const userBalance = await creditSystem.getBalance();
      setBalance(userBalance);
      return loggedInUser;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    creditSystem.logout();
    setUser(null);
    setBalance(0);
    setIsAuthenticated(false);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const newBalance = await creditSystem.getBalance();
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [isAuthenticated]);

  const spend = useCallback(async (amount, description) => {
    if (!isAuthenticated) throw new Error('Not authenticated');
    try {
      const transaction = await creditSystem.spend(amount, description);
      await refreshBalance();
      return transaction;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [isAuthenticated, refreshBalance]);

  return {
    user,
    balance,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    spend,
    refreshBalance,
    creditSystem
  };
}

// Example usage in a component
function App() {
  const { user, balance, login, logout, spend, isAuthenticated } = useCreditSystem();

  if (isAuthenticated) {
    return (
      <div>
        <h1>Welcome {user?.name}</h1>
        <p>Balance: {balance} credits</p>
        <button onClick={() => spend(10, 'API usage')}>Use Feature (10 credits)</button>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <LoginForm onLogin={login} />
  );
}
```

### Angular with Authentication
```typescript
// credit.service.ts
import { Injectable } from '@angular/core';
import { CreditSystem } from 'credit-system-sdk';
import { from, Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private creditSystem: CreditSystem;
  private userSubject = new BehaviorSubject<any>(null);
  private balanceSubject = new BehaviorSubject<number>(0);

  public user$ = this.userSubject.asObservable();
  public balance$ = this.balanceSubject.asObservable();

  constructor() {
    this.creditSystem = new CreditSystem({
      apiUrl: environment.apiUrl,
      authMode: 'standalone',
      autoRefreshToken: true,
      onBalanceUpdate: (balance) => {
        this.balanceSubject.next(balance);
      }
    });

    // Initialize on service creation
    this.creditSystem.init().then(() => {
      if (this.creditSystem.isAuthenticated()) {
        const user = this.creditSystem.getUser();
        this.userSubject.next(user);
        this.refreshBalance();
      }
    });
  }

  login(email: string, password: string): Observable<any> {
    return from(this.creditSystem.login({ email, password })).pipe(
      tap(user => {
        this.userSubject.next(user);
        this.refreshBalance();
      })
    );
  }

  logout(): void {
    this.creditSystem.logout();
    this.userSubject.next(null);
    this.balanceSubject.next(0);
  }

  isAuthenticated(): boolean {
    return this.creditSystem.isAuthenticated();
  }

  refreshBalance(): void {
    if (this.isAuthenticated()) {
      this.creditSystem.getBalance().then(balance => {
        this.balanceSubject.next(balance);
      });
    }
  }

  spend(amount: number, description: string): Observable<any> {
    return from(this.creditSystem.spend(amount, description)).pipe(
      tap(() => this.refreshBalance())
    );
  }

  getTransactionHistory(): Observable<any[]> {
    return from(this.creditSystem.getTransactionHistory());
  }
}

// login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CreditService } from './services/credit.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <h2>Login to Credit System</h2>
      <form (ngSubmit)="onLogin()">
        <div class="form-group">
          <input
            type="email"
            [(ngModel)]="email"
            name="email"
            placeholder="Email"
            required
          />
        </div>
        <div class="form-group">
          <input
            type="password"
            [(ngModel)]="password"
            name="password"
            placeholder="Password"
            required
          />
        </div>
        <button type="submit" [disabled]="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
        <div *ngIf="error" class="error">{{ error }}</div>
      </form>
    </div>
  `
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';

  constructor(
    private creditService: CreditService,
    private router: Router
  ) {}

  onLogin() {
    this.loading = true;
    this.error = '';

    this.creditService.login(this.email, this.password).subscribe({
      next: (user) => {
        console.log('Logged in as:', user.name);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.message || 'Login failed';
        this.loading = false;
      }
    });
  }
}

// dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CreditService } from './services/credit.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <h1>Welcome {{ (user$ | async)?.name }}!</h1>
      <div class="balance-card">
        <h2>Credit Balance</h2>
        <p class="balance">{{ balance$ | async }} credits</p>
      </div>

      <div class="actions">
        <button (click)="spend(10)">Use Feature (10 credits)</button>
        <button (click)="spend(25)">Premium Feature (25 credits)</button>
        <button (click)="viewHistory()">Transaction History</button>
        <button (click)="logout()">Logout</button>
      </div>

      <div *ngIf="transactions.length > 0" class="transactions">
        <h3>Recent Transactions</h3>
        <ul>
          <li *ngFor="let tx of transactions">
            {{ tx.type }}: {{ tx.amount }} credits - {{ tx.description }}
          </li>
        </ul>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  user$ = this.creditService.user$;
  balance$ = this.creditService.balance$;
  transactions: any[] = [];

  constructor(
    private creditService: CreditService,
    private router: Router
  ) {}

  ngOnInit() {
    // Redirect if not authenticated
    if (!this.creditService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  spend(amount: number) {
    this.creditService.spend(amount, `Feature usage - ${amount} credits`).subscribe({
      next: () => {
        console.log(`Successfully spent ${amount} credits`);
      },
      error: (err) => {
        alert(`Error: ${err.message}`);
      }
    });
  }

  viewHistory() {
    this.creditService.getTransactionHistory().subscribe(
      transactions => this.transactions = transactions
    );
  }

  logout() {
    this.creditService.logout();
    this.router.navigate(['/login']);
  }
}
```

### Vue 3 with Authentication (Composition API)
```vue
<!-- LoginView.vue -->
<template>
  <div class="login-container">
    <h2>Login to Credit System</h2>
    <form @submit.prevent="handleLogin">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCreditSystem } from '@/composables/useCreditSystem';

const router = useRouter();
const { login } = useCreditSystem();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    await login(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>

<!-- DashboardView.vue -->
<template>
  <div class="dashboard" v-if="user">
    <h1>Welcome {{ user.name }}!</h1>

    <div class="balance-card">
      <h2>Credit Balance</h2>
      <p class="balance">{{ balance }} credits</p>
      <button @click="refreshBalance">Refresh</button>
    </div>

    <div class="actions">
      <button @click="spend(10)">Use Feature (10 credits)</button>
      <button @click="spend(25)">Premium Feature (25 credits)</button>
      <button @click="showHistory = !showHistory">
        {{ showHistory ? 'Hide' : 'Show' }} History
      </button>
      <button @click="handleLogout">Logout</button>
    </div>

    <div v-if="showHistory && transactions.length > 0" class="transactions">
      <h3>Transaction History</h3>
      <ul>
        <li v-for="tx in transactions" :key="tx.id">
          {{ tx.type }}: {{ tx.amount }} credits - {{ tx.description }}
        </li>
      </ul>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCreditSystem } from '@/composables/useCreditSystem';

const router = useRouter();
const {
  user,
  balance,
  isAuthenticated,
  spend: spendCredits,
  refreshBalance,
  getHistory,
  logout
} = useCreditSystem();

const transactions = ref([]);
const showHistory = ref(false);
const error = ref('');

onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/login');
  }
});

const spend = async (amount) => {
  try {
    await spendCredits(amount, `Feature usage - ${amount} credits`);
    console.log(`Successfully spent ${amount} credits`);
  } catch (err) {
    error.value = err.message;
  }
};

const handleLogout = () => {
  logout();
  router.push('/login');
};

// Watch for history toggle
watch(showHistory, async (show) => {
  if (show) {
    transactions.value = await getHistory();
  }
});
</script>

<!-- composables/useCreditSystem.js -->
<script>
import { ref, computed } from 'vue';
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: import.meta.env.VITE_API_URL,
  authMode: 'standalone',
  autoRefreshToken: true
});

// Shared state
const user = ref(null);
const balance = ref(0);
const isInitialized = ref(false);

export function useCreditSystem() {
  const isAuthenticated = computed(() => !!user.value);

  const init = async () => {
    if (!isInitialized.value) {
      await creditSystem.init();
      isInitialized.value = true;

      // Check if already authenticated
      if (creditSystem.isAuthenticated()) {
        user.value = creditSystem.getUser();
        balance.value = await creditSystem.getBalance();
      }
    }
  };

  const login = async (email, password) => {
    await init();
    const loggedInUser = await creditSystem.login({ email, password });
    user.value = loggedInUser;
    balance.value = await creditSystem.getBalance();
    return loggedInUser;
  };

  const logout = () => {
    creditSystem.logout();
    user.value = null;
    balance.value = 0;
  };

  const spend = async (amount, description) => {
    const transaction = await creditSystem.spend(amount, description);
    balance.value = await creditSystem.getBalance();
    return transaction;
  };

  const refreshBalance = async () => {
    if (isAuthenticated.value) {
      balance.value = await creditSystem.getBalance();
    }
    return balance.value;
  };

  const getHistory = async () => {
    return await creditSystem.getTransactionHistory();
  };

  // Initialize on first use
  init();

  return {
    user,
    balance,
    isAuthenticated,
    login,
    logout,
    spend,
    refreshBalance,
    getHistory,
    creditSystem
  };
}
</script>
```

### Vue 2 with Authentication
```vue
<!-- Login.vue -->
<template>
  <div class="login-container">
    <h2>Login to Credit System</h2>
    <form @submit.prevent="handleLogin">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </div>
</template>

<script>
import { CreditSystem } from 'credit-system-sdk';

export default {
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: ''
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.error = '';

      try {
        const user = await this.$creditSystem.login({
          email: this.email,
          password: this.password
        });

        // Store user in Vuex or local state management
        this.$store.commit('setUser', user);

        // Get initial balance
        const balance = await this.$creditSystem.getBalance();
        this.$store.commit('setBalance', balance);

        this.$router.push('/dashboard');
      } catch (err) {
        this.error = err.message || 'Login failed';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<!-- Dashboard.vue -->
<template>
  <div class="dashboard" v-if="user">
    <h1>Welcome {{ user.name }}!</h1>

    <div class="balance-card">
      <h2>Credit Balance</h2>
      <p class="balance">{{ balance }} credits</p>
    </div>

    <div class="actions">
      <button @click="spend(10)">Use Feature (10 credits)</button>
      <button @click="spend(25)">Premium Feature (25 credits)</button>
      <button @click="loadHistory">View History</button>
      <button @click="logout">Logout</button>
    </div>

    <div v-if="transactions.length > 0" class="transactions">
      <h3>Transaction History</h3>
      <ul>
        <li v-for="tx in transactions" :key="tx.id">
          {{ tx.type }}: {{ tx.amount }} - {{ tx.description }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      transactions: []
    };
  },
  computed: {
    user() {
      return this.$store.state.user;
    },
    balance() {
      return this.$store.state.balance;
    }
  },
  mounted() {
    // Redirect if not authenticated
    if (!this.$creditSystem.isAuthenticated()) {
      this.$router.push('/login');
    }
  },
  methods: {
    async spend(amount) {
      try {
        await this.$creditSystem.spend(amount, `Feature usage - ${amount} credits`);
        const newBalance = await this.$creditSystem.getBalance();
        this.$store.commit('setBalance', newBalance);
        alert(`Successfully spent ${amount} credits`);
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    },
    async loadHistory() {
      this.transactions = await this.$creditSystem.getTransactionHistory();
    },
    logout() {
      this.$creditSystem.logout();
      this.$store.commit('setUser', null);
      this.$store.commit('setBalance', 0);
      this.$router.push('/login');
    }
  }
};
</script>

<!-- main.js - Vue 2 Plugin -->
<script>
import Vue from 'vue';
import { CreditSystem } from 'credit-system-sdk';

// Create and configure credit system instance
const creditSystem = new CreditSystem({
  apiUrl: process.env.VUE_APP_API_URL,
  authMode: 'standalone',
  autoRefreshToken: true
});

// Initialize credit system
creditSystem.init();

// Install as Vue plugin
Vue.prototype.$creditSystem = creditSystem;

// Optional: Create Vuex store for state management
const store = new Vuex.Store({
  state: {
    user: null,
    balance: 0
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setBalance(state, balance) {
      state.balance = balance;
    }
  }
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
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