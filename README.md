# ACME SSL Manager

Generic SSL manager for Let's Encrypt with DNS-01 challenge support.

## Features

- Works with any DNS provider (DuckDNS, Cloudflare, Route53, etc.)
- Automatic certificate generation and renewal
- Environment variable configuration
- WebSocket ready
- No hardcoded credentials

## Installation

```bash
npm install acme-client ws dotenv
```

## Quick Start

**1. Create a .env file**

```env
DOMAIN=your-domain.duckdns.org
EMAIL=your-email@gmail.com
DUCKDNS_TOKEN=your-token
PORT=10480
```

**2. Create a DNS provider**

Create a DNS provider with setTxt and optional clearTxt methods.

```javascript
const dnsProvider = {
    async setTxt(domain, value) {
        // Publish TXT record for domain
    },
    async clearTxt(domain, value) {
        // Optional: Clean up TXT record
    }
};
```

**3. Initialize SSL Manager**

```javascript
const SSLManager = require('./ssl-manager');

const ssl = new SSLManager({
    domain: process.env.DOMAIN,
    email: process.env.EMAIL,
    port: process.env.PORT || 10480,
    dnsProvider: dnsProvider,
});

ssl.startServer((server) => {
    // Your app logic here
});
```

## Examples

· examples/duckdns.js - DuckDNS integration
· examples/custom-provider.js - Custom provider template

## Security

· All credentials are stored in .env
· Certificates are stored in ./certs/
· Account keys are securely stored

## Requirements

· Node.js 16+
· DNS provider with API access

*Built with acme-client and Let's Encrypt.*
