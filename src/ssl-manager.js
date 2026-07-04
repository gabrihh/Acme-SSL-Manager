const acme = require('acme-client');
const https = require('https');
const fs = require('fs');
const dns = require('dns').promises;

class SSLManager {
    constructor(options) {
        this.config = {
            domains: Array.isArray(options.domain) ? options.domain : [options.domain],
            email: options.email,
            port: options.port || 443,
            certPath: options.certPath || './certs/cert.pem',
            keyPath: options.keyPath || './certs/key.pem',
            accountKeyPath: options.accountKeyPath || './certs/account-key.pem',
            dnsProvider: options.dnsProvider,
        };
        
        if (!this.config.dnsProvider) {
            throw new Error('DNS provider is required');
        }
    }

    async #publishTxt(domain, value) {
        const provider = this.config.dnsProvider;
        
        if (typeof provider.setTxt !== 'function') {
            throw new Error('DNS provider must implement setTxt(domain, value)');
        }
        
        await provider.setTxt(domain, value);
    }

    async #clearTxt(domain, value) {
        const provider = this.config.dnsProvider;
        
        if (typeof provider.clearTxt === 'function') {
            await provider.clearTxt(domain, value);
        }
    }

    async #waitForDnsPropagation(domain, expectedValue) {
        for (let i = 0; i < 20; i++) {
            try {
                const records = await dns.resolveTxt(domain);
                const values = records.flat().map(v => v.replace(/^"|"$/g, ''));
                if (values.some(v => v === expectedValue)) {
                    return true;
                }
            } catch (err) {}
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        return false;
    }

    async #getCertificate() {
        let accountKey;
        if (fs.existsSync(this.config.accountKeyPath)) {
            accountKey = fs.readFileSync(this.config.accountKeyPath, 'utf8');
        } else {
            accountKey = await acme.crypto.createPrivateKey();
            fs.mkdirSync('./certs', { recursive: true });
            fs.writeFileSync(this.config.accountKeyPath, accountKey);
        }

        const client = new acme.Client({
            directoryUrl: acme.directory.letsencrypt.production,
            accountKey: accountKey,
        });

        try {
            await client.createAccount({
                termsOfServiceAgreed: true,
                contact: [`mailto:${this.config.email}`]
            });
        } catch (err) {
            if (err.code !== 'accountAlreadyExists') throw err;
        }

        const [key, csr] = await acme.crypto.createCsr({
            commonName: this.config.domains[0],
            altNames: this.config.domains,
        });

        const cert = await client.auto({
            csr: csr,
            email: this.config.email,
            termsOfServiceAgreed: true,
            challengePriority: ['dns-01'],
            skipChallengeVerification: true,
            challengeCreateFn: async (authz, challenge, keyAuthorization) => {
                const domain = authz.identifier.value;
                await this.#publishTxt(domain, keyAuthorization);
                
                const propagated = await this.#waitForDnsPropagation(domain, keyAuthorization);
                if (!propagated) {
                    throw new Error(`DNS propagation failed for ${domain}`);
                }
            },
            challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
                const domain = authz.identifier.value;
                await this.#clearTxt(domain, keyAuthorization);
            }
        });

        fs.mkdirSync('./certs', { recursive: true });
        fs.writeFileSync(this.config.certPath, cert);
        fs.writeFileSync(this.config.keyPath, key);

        return { cert, key };
    }

    async startServer(appHandler) {
        let cert, key;
        if (fs.existsSync(this.config.certPath) && fs.existsSync(this.config.keyPath)) {
            cert = fs.readFileSync(this.config.certPath, 'utf8');
            key = fs.readFileSync(this.config.keyPath, 'utf8');
        } else {
            const result = await this.#getCertificate();
            cert = result.cert;
            key = result.key;
        }

        const server = https.createServer({ cert, key });
        
        if (appHandler) {
            appHandler(server);
        }

        server.listen(this.config.port, () => {
            console.log(`HTTPS server running on https://${this.config.domains[0]}:${this.config.port}`);
        });

        setInterval(async () => {
            try {
                const { cert: newCert, key: newKey } = await this.#getCertificate();
                server.setSecureContext({ cert: newCert, key: newKey });
                console.log('Certificate renewed successfully');
            } catch (err) {
                console.error('Certificate renewal failed:', err.message);
            }
        }, 24 * 60 * 60 * 1000);

        return server;
    }
}

module.exports = SSLManager;
