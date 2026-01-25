# Reporting Application

A full-stack reporting application for Times Group with role-based access control.

## Features

### Role Hierarchy
- **CEO** (ceo@timesgroup.com)
  - Can create Admins + Users
  - Can reset any password
  - Can change user roles
  - Can delete users
  
- **Admin**
  - Can create Users only
  - Can reset own password + any User password
  - Cannot create Admins
  
- **User**
  - Can only submit forms
  - Can reset own password

### User Dashboard
- Submission types: Depo, Vendor, Dealer, Stall, Reader, OOH
- Form fields: Area, Person Met, Date (auto-filled), Accompanied By, Insights, Campaign, Discussion, Outcome
- OOH type includes Phone Number field

### Admin Dashboard
- **Submissions Viewer**: Table with pagination, filters, and CSV export
- **Analytics**: Charts for submissions by Type, Area, User, and Month
- **User Management**: Create users, reset passwords, manage roles

## Tech Stack

### Backend
- Node.js + Express
- MySQL 8
- JWT authentication with refresh tokens
- bcrypt password hashing

### Frontend
- React 18 + Vite
- Tailwind CSS
- Recharts for analytics
- React Router for navigation

## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8+

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update `.env` with your MySQL credentials

5. Create MySQL database:
```sql
CREATE DATABASE reporting_app;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'StrongPass!23';
GRANT ALL PRIVILEGES ON reporting_app.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

6. Run migrations:
```bash
npm run migrate
```

7. Seed CEO user:
```bash
npm run seed
```

8. Start server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000

### Default Login
- **Email**: ceo@timesgroup.com
- **Password**: CEO@123 (will be forced to reset on first login)

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/force-reset` - Force password reset (first login)
- `POST /auth/reset-password` - Change password
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Users (Admin/CEO)
- `GET /users` - List users
- `POST /users` - Create user
- `PATCH /users/:id/reset-password` - Reset user password
- `PATCH /users/:id/role` - Change user role (CEO only)
- `DELETE /users/:id` - Delete user (CEO only)

### Submissions
- `POST /submissions` - Create submission
- `GET /submissions` - List submissions (with filters)
- `GET /submissions/export` - Export as CSV
- `GET /submissions/areas` - Get distinct areas

### Analytics
- `GET /analytics/by-type` - Submissions by type
- `GET /analytics/by-area` - Submissions by area
- `GET /analytics/by-user` - Submissions by user
- `GET /analytics/by-month` - Submissions by month
- `GET /analytics/summary` - Dashboard summary

## Production Deployment

See `DEPLOYMENT.md` for detailed deployment instructions on Hostinger VPS.

## Security Features

- JWT with httpOnly refresh token cookies
- bcrypt password hashing
- Rate limiting on auth routes
- Helmet middleware for security headers
- Input validation and sanitization
- Parameterized SQL queries
- Force password reset on first login

## License

Proprietary - Times Group
