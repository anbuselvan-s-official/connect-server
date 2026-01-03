# Connect-Server

A secure, real-time messaging backend built with NestJS, implementing the Signal Protocol for end-to-end encryption.

## 🚀 Features

- **End-to-End Encryption**: Signal Protocol implementation with Double Ratchet algorithm
- **Real-time Messaging**: WebSocket-based communication using Socket.IO
- **Secure Authentication**: JWT-based authentication with OTP verification
- **Key Management**: Identity keys, signed prekeys, and one-time prekeys for perfect forward secrecy
- **User Management**: Profile management, user search, and discovery
- **Database**: PostgreSQL with Prisma ORM
- **API Documentation**: Swagger/OpenAPI integration
- **Docker Support**: Production-ready containerization

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Docker Deployment](#docker-deployment)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [WebSocket Events](#websocket-events)
- [Security](#security)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

## 🔧 Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x
- Yarn package manager

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd Connect-Server

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start the development server
yarn start:dev
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/connect?schema=public
POSTGRES_USER=connect
POSTGRES_PASSWORD=connect
POSTGRES_DB=connect
POSTGRES_PORT=5432

# Application Configuration
PORT=3000
DEV_PORT=3001
NODE_ENV=development

# JWT Configuration (Authentication)
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-change-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-in-production

# Redis Configuration (Session & Caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Feature Flags
FEATURE=true
```

**Important Notes:**
- Replace `username` and `password` in `DATABASE_URL` with your PostgreSQL credentials
- Change all secret keys in production to strong, randomly generated values
- `REDIS_PASSWORD` can be left empty if Redis is running without authentication (development only)
- For production, use strong passwords and enable Redis authentication

## 🏃 Running the Application

### Development Mode

```bash
# With hot-reload
yarn start:dev

# Debug mode
yarn start:debug
```

### Production Mode

```bash
# Build the application
yarn build

# Start production server
yarn start:prod
```



## 📚 API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api
```

### Main Endpoints

#### Authentication
- `POST /auth/request-otp` - Request OTP for login
- `POST /auth/verify-otp` - Verify OTP and get tokens
- `POST /auth/refresh` - Refresh access token

#### Registration
- `POST /registeration/publish-keys` - Publish cryptographic key bundle

#### Keys
- `GET /keys/:user_id` - Get user's key bundle for encryption
- `PUT /keys/mark-used/:otpk_id` - Mark one-time prekey as used

#### Users
- `GET /users/search` - Search users by mobile or username
- `PUT /users/profile` - Update user profile

## 🏗️ Project Structure

```
Connect-Server/
├── prisma/
│   ├── migrations/          # Database migrations
│   └── schema.prisma        # Database schema
├── src/
│   ├── auth/               # Authentication module
│   ├── keys/               # Key management module
│   ├── prisma/             # Prisma service
│   ├── registeration/      # User registration module
│   ├── users/              # User management module
│   ├── websocket/          # WebSocket gateway
│   ├── app.module.ts       # Root module
│   └── main.ts             # Application entry point
├── types/
│   ├── request/            # Request DTOs
│   └── response/           # Response DTOs
├── enums/                  # Enumerations
├── constants/              # Constants
├── utils/                  # Utility functions
├── .env.example            # Environment variables template
└── package.json            # Dependencies and scripts
```

## 🗄️ Database Schema

### Models

- **User**: User accounts with identity keys
- **RefreshToken**: JWT refresh tokens
- **SignedPreKey**: Signed prekeys for Signal Protocol
- **OneTimePreKey**: One-time prekeys for perfect forward secrecy
- **Profile**: User profile information

### Relationships

```
User
├── RefreshToken[]
├── SignedPreKey[]
├── OneTimePreKey[]
└── Profile[]
```

## 🔌 WebSocket Events

### Client → Server

#### `message`
Send an encrypted message to another user.

```typescript
{
  target_id: string,
  message: string,        // Encrypted message JSON
  message_id: string,
  conversation_id: string,
  timestamp: number
}
```

#### `get_online_users`
Request list of currently online users.

### Server → Client

#### `message`
Receive an encrypted message from another user.

#### `message_sent`
Confirmation of message delivery status.

```typescript
{
  message_id: string,
  status: 'delivered' | 'pending',
  timestamp: number,
  error?: string
}
```

#### `online_users`
List of currently online user IDs.

```typescript
string[]
```

#### `error`
Error notification.

```typescript
{
  error: string,
  message_id?: string,
  details?: string
}
```

## 🔒 Security

### Encryption

- **Signal Protocol**: Industry-standard end-to-end encryption
- **Identity Keys**: Long-term user identity
- **Signed Prekeys**: Medium-term keys with signatures
- **One-time Prekeys**: Single-use keys for perfect forward secrecy

### Authentication

- **JWT Tokens**: Secure authentication with short-lived access tokens
- **Refresh Tokens**: Long-lived tokens for obtaining new access tokens
- **OTP Verification**: Phone number verification (currently using dummy OTP '123456' for development)

### Best Practices

- Non-root user in Docker containers
- Environment variable management
- CORS configuration
- Input validation
- SQL injection prevention via Prisma

## 🛠️ Development

### Available Scripts

```bash
# Development
yarn start:dev          # Start with hot-reload
yarn start:debug        # Start in debug mode

# Building
yarn build              # Build for production

# Code Quality
yarn lint               # Run ESLint
yarn format             # Format code with Prettier

# Database
yarn prisma:generate    # Generate Prisma Client
yarn prisma:migrate     # Create and apply migration

# Testing
yarn test               # Run unit tests
yarn test:watch         # Run tests in watch mode
yarn test:cov           # Generate coverage report
yarn test:e2e           # Run end-to-end tests
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## 🧪 Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov

# Watch mode
yarn test:watch
```

## 📝 Environment Variables

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string (used by Prisma) | - | ✅ |
| `POSTGRES_USER` | PostgreSQL username | `connect` | ✅ |
| `POSTGRES_PASSWORD` | PostgreSQL password | `connect` | ✅ |
| `POSTGRES_DB` | PostgreSQL database name | `connect` | ✅ |
| `POSTGRES_PORT` | PostgreSQL port | `5432` | ❌ |

### Application Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Application port | `3000` | ❌ |
| `DEV_PORT` | Development port | `3001` | ❌ |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | ❌ |
| `FEATURE` | Feature flag for experimental features | `true` | ❌ |

### Authentication Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ACCESS_TOKEN_SECRET` | Secret key for JWT access token signing | `access-secret` | ✅ |
| `REFRESH_TOKEN_SECRET` | Secret key for JWT refresh token signing | `refresh-secret` | ✅ |

**Note:** Default values are used only if not specified. For production, always set strong secret keys.

### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis server host | `localhost` | ❌ |
| `REDIS_PORT` | Redis server port | `6379` | ❌ |
| `REDIS_PASSWORD` | Redis authentication password | - | ❌ |
| `REDIS_DB` | Redis database number | `0` | ❌ |

**Note:** Redis is used for session management, message queuing, and caching online users.

## 🚧 Roadmap

- [ ] Implement actual OTP service integration
- [ ] Add message persistence
- [ ] Implement message delivery receipts
- [ ] Add typing indicators
- [ ] Implement group messaging
- [ ] Add file/media sharing
- [ ] Implement push notifications
- [ ] Add rate limiting
- [ ] Implement user blocking
- [ ] Add message search functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED License.

## 👥 Authors

- Anbuselvan - Initial work

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Socket.IO](https://socket.io/) - Real-time communication
- [Signal Protocol](https://signal.org/docs/) - End-to-end encryption

## 📞 Support

For support, email anbuselvan.s.official@gmail.com or open an issue in the repository.

## 🔗 Related Projects

- [Connect-Android](link-to-android-client) - Android client application

---

**Built with ❤️ using NestJS and the Signal Protocol**
