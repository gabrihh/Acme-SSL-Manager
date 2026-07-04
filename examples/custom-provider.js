const SSLManager = require('../src/ssl-manager');
require('dotenv').config();

const dnsProvider = {
    async setTxt(domain, value) {
        // Your DNS provider API call
        // Example: AWS Route53, Google DNS, etc.
        console.log(`Setting TXT for ${domain}: ${value}`);
    },
    async clearTxt(domain, value) {
        // Optional: Clean up TXT record
        console.log(`Clearing TXT for ${domain}`);
    }
};

const ssl = new SSLManager({
    domain: process.env.DOMAIN,
    email: process.env.EMAIL,
    port: process.env.PORT || 3000,
    dnsProvider: dnsProvider,
});

ssl.startServer((server) => {
    // Your app logic here
});
