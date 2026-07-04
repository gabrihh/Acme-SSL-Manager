const SSLManager = require('../src/ssl-manager');
const WebSocket = require('ws');
require('dotenv').config();

const dnsProvider = {
    async setTxt(domain, value) {
        const subdomain = domain.replace('.duckdns.org', '');
        const url = `https://www.duckdns.org/update?domains=${subdomain}&token=${process.env.DUCKDNS_TOKEN}&txt=${value}`;
        const response = await fetch(url);
        const text = await response.text();
        if (!text.startsWith('OK')) {
            throw new Error(`DuckDNS error: ${text}`);
        }
    },
    async clearTxt(domain, value) {
        const subdomain = domain.replace('.duckdns.org', '');
        const url = `https://www.duckdns.org/update?domains=${subdomain}&token=${process.env.DUCKDNS_TOKEN}&clear=true`;
        await fetch(url);
    }
};

const ssl = new SSLManager({
    domain: process.env.DOMAIN,
    email: process.env.EMAIL,
    port: process.env.PORT || 3000,
    dnsProvider: dnsProvider,
});

ssl.startServer((server) => {
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        console.log('Client connected');
        ws.on('message', (data) => {
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });
        });
    });
});
