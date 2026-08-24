# NCT Scheduler API

A Node.js/Express backend for tracking learning progress across Neo Cloud Tech. departments, cohorts

## Tech Stack

- Express.js
- Prisma (PostgreSQL)
- TypeScript
- JWT for authentication

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Student login (external portal) |
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/auth/instructor/register` | Instructor registration |
| POST | `/api/auth/instructor/login` | Instructor login |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/department` | Create department (Admin only) |
| GET | `/api/department/:id` | Get department by ID |
| GET | `/api/department` | List all departments |

### Cohorts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cohort` | Create cohort (Admin only) |
| GET | `/api/cohort/:id` | Get cohort by ID |
| GET | `/api/cohort` | List all cohorts |

### Curriculum
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/curriculum` | Upload curriculum PDF (Admin only) |
| GET | `/api/curriculum/:id` | Get curriculum by ID |
| GET | `/api/curriculum/department/:departmentId` | Get all curricula for a department |
| GET | `/api/curriculum` | List all curricula |

## Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
PORT=3000
ADMIN_USERNAME=admin_username
ADMIN_PASSWORD=admin_password
```

## Project Structure

```
src/
├── modules/
│   ├── auth/           # Authentication logic
│   ├── department/     # Department CRUD
│   └── cohort/         # Cohort CRUD
├── shared/
│   └── middleware/     # Auth & admin guards
└── app.ts              # Express setup
```

## Authentication

- **Students**: Authenticate via external portal proxy
- **Instructors**: Local JWT-based auth with registration flow
- **Admin**: Protected routes require admin role

## Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # TypeScript compilation
npm start        # Production server
npm run prisma:studio  # Open Prisma GUI
```

## License

ISC