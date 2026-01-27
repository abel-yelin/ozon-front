# Shop Studio

Shop Studio is a powerful multi-platform e-commerce management solution for cross-border sellers. Seamlessly manage your Amazon, Ozon, Shopee stores from one centralized dashboard.

## Features

- **Multi-Platform Integration** - Connect all your e-commerce platforms (Amazon, Ozon, Shopee) in one place
- **Centralized Order Management** - Process and fulfill orders from all platforms in a unified interface
- **Real-time Inventory Sync** - Automatically synchronize inventory across all platforms to prevent overselling
- **Product Listing Automation** - Bulk upload and optimize product listings across multiple platforms
- **Advanced Analytics** - Comprehensive sales analytics and performance insights across all channels
- **Smart Workflow Automation** - Automate repetitive tasks and streamline your e-commerce operations

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm, npm, or yarn

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure your environment variables:

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (if needed)
DATABASE_URL=your_database_url

# OAuth Providers (if needed)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment (if needed)
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Platform Credentials Encryption
CREDENTIAL_ENCRYPTION_KEY=your_encryption_key
```

## Documentation

For detailed documentation and guides, please visit our [Documentation](./docs).

## Deployment

### Docker Deployment

Shop Studio includes a Dockerfile for containerized deployment:

```bash
# Build Docker image
docker build -t shop-studio .

# Run container
docker run -p 3000:3000 shop-studio
```

### Platform Deployment

You can deploy to various platforms:

- **Vercel** - One-click deployment
- **Dokploy** - Self-hosted deployment with automatic CI/CD
- **AWS/GCP/Azure** - Cloud platform deployment

See [Deployment Guide](./docs/deployment.md) for more details.

## Support

- **Documentation** - [https://shop-studio.example.com/docs](https://shop-studio.example.com/docs)
- **Issues** - [GitHub Issues](https://github.com/abel-yelin/ozon-front/issues)
- **Discord Community** - Join our Discord server for community support
- **Email** - support@shop-studio.example.com

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Copyright © 2025 Shop Studio. All rights reserved.

!!! This project is proprietary software. Please do not publicly release Shop Studio's code without permission.

[LICENSE](./LICENSE)
