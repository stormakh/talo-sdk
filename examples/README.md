# Framework Integrations

This folder contains practical integration examples for Talo payments in popular TypeScript backends.

- [Next.js App Router](./nextjs/README.md)
- [Hono](./hono/README.md)
- [Elysia](./elysia/README.md)
- [NestJS](./nestjs/README.md)

All examples use `talo-pay` and show:
- Credentials-based client initialization (`clientId`, `clientSecret`, `userId`).
- Environment selection via `environment: "production" | "sandbox"`.
- Payment creation endpoint.
- Webhook handling endpoint using `talo.webhooks.handler(...)` with WinterCG `Request`/`Response`.
