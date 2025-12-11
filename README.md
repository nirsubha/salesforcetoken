# Next.js Salesforce Token Starter

Secure server-side Salesforce OAuth2 token fetch using `client_credentials`.

## Steps
1. Add environment variables in Vercel:
   - SF_INSTANCE_URL
   - SF_CLIENT_ID
   - SF_CLIENT_SECRET
2. Deploy.
3. Call `/api/token` to test.

Do NOT expose access tokens to the browser in production.
