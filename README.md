# Credit System SDK

A universal JavaScript/TypeScript SDK for credit system management. Compatible with React, Angular, Vue, and any JavaScript framework or environment.

## Installation

### From npm (when published)
```bash
npm install credit-system-sdk
# or
yarn add credit-system-sdk
# or
pnpm add credit-system-sdk
```

### Direct from GitHub (available now)
```bash
npm install developersupreme/credit-system-sdk
# or
npm install git+https://github.com/developersupreme/credit-system-sdk.git
# or for a specific branch/tag
npm install git+https://github.com/developersupreme/credit-system-sdk.git#main
```

## Quick Start

### ES Modules (React, Vue, Angular, Modern JS)
```javascript
import { CreditSystem } from 'credit-system-sdk';

const creditSystem = new CreditSystem({
  apiUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Get user balance
const balance = await creditSystem.getBalance('user123');
console.log('Balance:', balance);
```

### CommonJS (Node.js, Legacy Systems)
```javascript
const { CreditSystem } = require('credit-system-sdk');

const creditSystem = new CreditSystem({
  apiUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Get user balance
creditSystem.getBalance('user123').then(balance => {
  console.log('Balance:', balance);
});
```

## Features

- 🚀 **Universal Compatibility** - Works with any JavaScript framework
- 📦 **Dual Package Support** - CommonJS and ES Modules
- 🔷 **TypeScript Ready** - Full type definitions included
- ⚛️ **React/Next.js Compatible** - Works out of the box
- 🅰️ **Angular Ready** - Easy integration with Angular services
- 🟢 **Vue.js Support** - Compatible with Vue 2 and Vue 3
- 🔒 **Secure** - Built-in authentication and authorization
- 📊 **Credit Management** - Complete credit system operations
- 🔍 **Transaction History** - Track all credit transactions
- 🛡️ **Error Handling** - Custom error types with proper codes
- 📝 **Comprehensive Logging** - Built-in logger with multiple levels

## Framework Examples

See [USAGE.md](./USAGE.md) for detailed examples with:
- React (Hooks and Components)
- Angular (Services and Components)
- Vue 2 & Vue 3
- Next.js (API Routes and SSR)
- Node.js/Express
- Vanilla JavaScript

## API Reference

### Core Methods

```typescript
// Initialize
const creditSystem = new CreditSystem(config);

// Get balance
await creditSystem.getBalance(userId: string): Promise<number>

// Add credits
await creditSystem.addCredits(userId: string, amount: number): Promise<Transaction>

// Deduct credits
await creditSystem.deductCredits(userId: string, amount: number): Promise<Transaction>

// Transfer credits
await creditSystem.transferCredits(fromUserId: string, toUserId: string, amount: number): Promise<Transaction>

// Get transaction history
await creditSystem.getTransactionHistory(userId: string): Promise<Transaction[]>
```

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Node.js Support

- Node.js 14.0.0 or higher

## Publishing to npm

To publish this package to npm:

1. Create an npm account at https://www.npmjs.com
2. Login to npm: `npm login`
3. Publish: `npm publish`

To use a scoped package name (recommended):
1. Update package name in package.json to `@yourscope/credit-system-sdk`
2. Publish with: `npm publish --access public`

## Local Testing

Before publishing, test locally:

```bash
# Create a package
npm pack

# In your test project
npm install ../credit-system-sdk/credit-system-sdk-1.0.0.tgz
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you find any issues, please report them at [GitHub Issues](https://github.com/developersupreme/credit-system-sdk/issues)

## Repository

[https://github.com/developersupreme/credit-system-sdk](https://github.com/developersupreme/credit-system-sdk)