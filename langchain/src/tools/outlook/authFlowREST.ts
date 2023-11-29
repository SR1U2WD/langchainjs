import * as http from 'http';
import * as url from 'url';
import * as openurl from 'openurl';
import { AuthFlowBase } from './authFlowBase.js';

interface AccessTokenResponse {
    access_token: string;
}

export class AuthFlowREST extends AuthFlowBase {

    private port: number;
    private pathname: string;

    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        super(clientId, clientSecret, redirectUri);
        const parsedUrl = new URL(this.redirectUri);
        this.port = parsedUrl.port ? parseInt(parsedUrl.port) : 3000;
        this.pathname = parsedUrl.pathname || '';
    }

    // Function to construct the OAuth URL
    private openAuthUrl(): string {
        const loginEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
        const clientId = this.clientId; // client ID regestered in Azure
        const response_type = 'code';
        const response_mode = 'query';
        const redirectUri = encodeURIComponent(this.redirectUri); // redirect URI regestered in Azure
        const scope = encodeURIComponent('openid offline_access https://graph.microsoft.com/.default');
        const state = '12345';
        
        const url = [
            `${loginEndpoint}?client_id=${clientId}`,
            `&response_type=${response_type}`,
            `&response_mode=${response_mode}`,
            `&redirect_uri=${redirectUri}`,
            `&scope=${scope}`,
            `&state=${state}`
        ].join('');
        openurl.open(url);
        return url;
    }

    // Function to start the server
    private startServer(): Promise<http.Server> {
        return new Promise((resolve, reject) => {
            const server = http.createServer();
    
            server.listen(this.port, () => {
                console.log(`Server listening at http://localhost:${this.port}`);
                resolve(server);
            });
    
            server.on('error', (err) => {
                reject(err);
            });
        });
    }

    // Function to listen for the authorization code
    private async listenForCode(server: http.Server): Promise<string> {
        return new Promise((resolve, reject) => {
            server.on('request', (req, res) => {
                try {
                    const reqUrl = url.parse(req.url || '', true);
    
                    if (reqUrl.pathname === this.pathname) {
                        const authCode = reqUrl.query.code as string;
    
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('Authorization code received. You can close this window.');
    
                        server.close();
                        resolve(authCode); // Resolve the Promise with the authorization code
                    } else {
                        res.writeHead(404);
                        res.end("404 Not Found");
                    }
                } catch (err) {
                    res.writeHead(500);
                    res.end('Server error');
                    reject(err);
                }  
            });
        });
    }

    // Main function to run the auth flow
    private async getCode(): Promise<string> {
        // check credentials
        if (!this.clientId || !this.redirectUri) {
            throw new Error('Missing clientId or redirectUri.');
        }
        try {
            const server = await this.startServer();
            this.openAuthUrl();
            const code = await this.listenForCode(server);
            return code;
        } catch (err) {
            console.error('Error during authentication:', err);
            return '';
        }
    }

    // Function to get the token using the code and client credentials
    public async getAccessToken(): Promise<string> {
        // check credentials
        if (!this.clientId || !this.clientSecret || !this.redirectUri) {
            throw new Error('Missing clientId, clientSecret or redirectUri.');
        }
        try {
            const code = await this.getCode();
            const req_body =
                `client_id=${encodeURIComponent(this.clientId)}&` +
                `client_secret=${encodeURIComponent(this.clientSecret)}&` +
                `scope=${encodeURIComponent('https://graph.microsoft.com/.default')}&` +
                `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
                `grant_type=authorization_code&` +
                `code=${encodeURIComponent(code)}`;
    
            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: req_body
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const json = await response.json() as AccessTokenResponse;
            return json.access_token;
        } catch (error) {
            console.error('Error getting access token:', error);
            return '';
        }
    }
}

