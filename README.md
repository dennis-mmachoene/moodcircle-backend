# MoodCircle Backend API

Anonymous, emotion-driven social platform backend. Share moods, not identities. Posts auto-delete after 24 hours.

## Features

- ** OTP Authentication**: Email-based login with JWT access/refresh tokens
- ** Mood Detection**: Auto-classify emotions using HuggingFace AI or fallback heuristics
- ** Auto-Expiry**: Posts automatically delete after 24 hours
- ** Reactions System**: One reaction per user per post
- ** Voice Posts**: Upload audio with text
- ** Privacy-First**: Zero personal data storage, pseudonymous only
- ** Security**: Rate limiting, input validation, XSS protection, CSRF guards
- ** Comprehensive Tests**: 90%+ coverage with Jest

## Quick Start

### Prerequisites

- Node.js ≥18.0.0
- npm ≥9.0.0
- Supabase account
- HuggingFace API key (optional, fallback available)

### Installation

```bash
# Clone repository
git clone https://github.com/dennis-mmachoene/moodcircle-backend.git
cd moodcircle-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure .env with your credentials
# (See Configuration section below)
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database-schema.sql` in Supabase SQL Editor
3. Create storage bucket named `voice-posts` with public access

### Configuration

Edit `.env` with your credentials:

```bash
# Required
SUPABASE_URL=your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_ACCESS_SECRET=random-64-char-string
JWT_REFRESH_SECRET=different-64-char-string
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional
HUGGINGFACE_API_KEY=your-hf-key
```

### Run

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test

# Lint code
npm run lint
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/request-otp` | Request OTP code | No |
| POST | `/api/v1/auth/verify-otp` | Verify OTP & get tokens | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| POST | `/api/v1/auth/logout` | Revoke refresh token | Yes |
| POST | `/api/v1/auth/logout-all` | Revoke all sessions | Yes |
| GET | `/api/v1/auth/verify` | Verify access token | Yes |

### Posts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/posts` | Create post | Yes |
| GET | `/api/v1/posts` | Get all posts (paginated) | Optional |
| GET | `/api/v1/posts/mood/:mood` | Get posts by mood | Optional |
| GET | `/api/v1/posts/:id` | Get single post | Optional |

### Reactions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/reactions/:postId` | Add/update/remove reaction | Yes |
| DELETE | `/api/v1/reactions/:postId` | Remove reaction | Yes |
| GET | `/api/v1/reactions/:postId` | Get reaction counts | No |
| GET | `/api/v1/reactions/:postId/user` | Get user's reaction | Yes |

### Example Requests

**Request OTP:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Verify OTP:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456"}'
```

**Create Post:**
```bash
curl -X POST http://localhost:5000/api/v1/posts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Feeling great today!","mood":"joy"}'
```

**React to Post:**
```bash
curl -X POST http://localhost:5000/api/v1/reactions/POST_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reactionType":"stay_strong"}'
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm test -- src/tests/auth.test.js

# Watch mode
npm run test:watch
```

## Project Structure

```
src/
├── config/          # Environment & DB configuration
├── middleware/      # Auth, validation, rate limiting
├── routes/          # API route handlers
├── services/        # Business logic
├── utils/           # Helper functions
├── tests/           # Jest test suites
└── app.js           # Express app entry point
```

## Security Features

- **JWT Authentication**: Separate access/refresh tokens with expiry
- **Rate Limiting**: Prevents abuse (100 req/15min default)
- **Input Validation**: express-validator for all inputs
- **XSS Protection**: xss-clean middleware
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Configurable origin whitelist
- **SQL Injection**: Parameterized queries via Supabase client

## Deployment

### Environment Variables

Ensure all required variables in `.env.example` are set in production.

### Recommended Services

- **Hosting**: Render, Railway, Fly.io, AWS EC2
- **Database**: Supabase (managed PostgreSQL)
- **Email**: Gmail App Password, SendGrid, AWS SES

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Configure CORS origin to frontend domain
- [ ] Enable HTTPS only
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure log retention
- [ ] Review rate limits
- [ ] Test email deliverability

## Monitoring

Application logs to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/all.log` (all levels)

Use Winston logger throughout codebase.

## Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

Ensure tests pass and lint is clean before submitting.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- HuggingFace for emotion classification models
- Supabase for backend infrastructure
- Nodemailer for email delivery
- Express.js community

--- 