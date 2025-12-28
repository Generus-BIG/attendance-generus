# Shadcn Admin Dashboard

A modern, feature-rich admin dashboard template built with React, TypeScript, and shadcn/ui components. This template provides a complete foundation for building enterprise-grade admin interfaces with built-in attendance management, user management, task tracking, and more.

## Features

### Core Features
- **Attendance Management** - Track and manage employee attendance with detailed logs
- **User Management** - Complete user CRUD operations with role-based access control
- **Task Management** - Create, assign, and track tasks across your organization
- **Approval Workflow** - Streamlined approval process for various requests
- **Chat System** - Real-time communication between team members
- **Forms Management** - Dynamic form creation and submission handling
- **Settings** - Comprehensive user and system configuration options
- **Dashboard** - Analytics and overview with visual charts and metrics

### Technical Features
- **Type-Safe** - Built with TypeScript for maximum type safety
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- **Dark Mode Support** - Full dark/light theme switching
- **RTL Support** - Right-to-left language support ready
- **Authentication** - Clerk integration for secure auth
- **Data Persistence** - Supabase backend integration
- **Real-time Updates** - React Query for efficient data fetching and caching
- **Advanced Tables** - TanStack Table with sorting, filtering, and pagination
- **Form Handling** - React Hook Form with Zod validation
- **Charts & Visualization** - Recharts for data visualization

## Tech Stack

### Frontend Framework & Tools
- **React** 19.x - UI library
- **TypeScript** 5.9.x - Type safety
- **Vite** 7.3.x - Build tool and dev server
- **TanStack Router** 1.x - File-based routing
- **Tailwind CSS** 4.x - Utility-first CSS framework

### UI Components & Libraries
- **shadcn/ui** - High-quality React components
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Beautiful icon library

### State Management & Data Fetching
- **Zustand** 5.x - Lightweight state management
- **React Query** 5.x - Server state management and caching
- **React Hook Form** 7.x - Performant form handling

### Backend & Services
- **Supabase** - Open-source Firebase alternative
- **Clerk** 5.x - Authentication and user management

### Development Tools
- **ESLint** 9.x - Code linting
- **Prettier** - Code formatting
- **Knip** - Unused file detection
- **TypeScript ESLint** - TypeScript-specific linting
- **Vite React Plugin** - React fast refresh support

## Project Structure

```
src/
├── assets/               # Static assets and icons
│   ├── brand-icons/      # Third-party brand icons
│   └── custom/           # Custom application icons
├── components/           # Reusable UI components
│   ├── data-table/       # Advanced table components
│   ├── layout/           # Layout components
│   └── ui/               # shadcn/ui components
├── config/               # Configuration files
├── context/              # React context providers
│   ├── direction-provider.tsx
│   ├── font-provider.tsx
│   ├── layout-provider.tsx
│   ├── search-provider.tsx
│   └── theme-provider.tsx
├── features/             # Feature modules
│   ├── approvals/        # Approval workflow
│   ├── apps/             # App management
│   ├── attendance/       # Attendance tracking
│   ├── auth/             # Authentication
│   ├── chats/            # Chat system
│   ├── dashboard/        # Dashboard & analytics
│   ├── errors/           # Error pages
│   ├── forms/            # Form management
│   ├── participants/     # Participant management
│   ├── settings/         # User settings
│   ├── tasks/            # Task management
│   └── users/            # User management
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries and helpers
│   ├── schema.ts         # Zod validation schemas
│   ├── supabase.ts       # Supabase client setup
│   ├── utils.ts          # Utility functions
│   └── types/            # TypeScript type definitions
├── routes/               # TanStack Router route definitions
├── stores/               # Zustand stores
└── styles/               # Global styles
```

## Installation

### Prerequisites
- Node.js 18+ or higher
- pnpm 8+ (recommended) or npm/yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shadcn-admin
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Clerk Authentication
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key

   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. **Start the Development Server**
   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:5173`

## Available Scripts

- `pnpm dev` - Start development server with hot module replacement
- `pnpm build` - Build for production (runs TypeScript check + Vite build)
- `pnpm preview` - Preview production build locally
- `pnpm lint` - Run ESLint to check code quality
- `pnpm format:check` - Check code formatting with Prettier
- `pnpm format` - Auto-format all code with Prettier
- `pnpm knip` - Find unused files and dependencies

## Configuration

### Theme Configuration
The application uses Tailwind CSS for styling. Customize the theme in `tailwind.config.ts` and apply theme colors in `src/styles/theme.css`.

### Layout Options
Multiple layout options are available:
- Default Layout
- Compact Layout
- Full-width Layout
- Sidebar variations (floating, inset, standard)

Switch layouts from the config drawer in the application header.

### Font Management
Fonts are configured in `src/config/fonts.ts` and applied via `FontProvider` context.

## Authentication

The application uses **Clerk** for authentication. Features include:
- Social authentication (Google, GitHub, etc.)
- Password-based authentication
- Multi-factor authentication support
- User profile management

Configure your Clerk app in the Clerk dashboard and update your environment variables.

## Database

**Supabase** is used for backend database operations. Key features:
- PostgreSQL database
- Real-time subscriptions
- Row-level security (RLS)
- Built-in authentication

Database client is initialized in `src/lib/supabase.ts`.

## Styling

The project uses **Tailwind CSS v4** with custom configuration:
- Custom color schemes with light/dark mode support
- Responsive utility classes
- Animation utilities from `tw-animate-css`
- Component-level CSS customization with shadcn/ui

## Key Dependencies

### UI & Components
- `@radix-ui/*` - Headless UI primitives
- `lucide-react` - Icon library
- `cmdk` - Command menu component

### Form & Validation
- `react-hook-form` - Efficient form handling
- `@hookform/resolvers` - RHF validation resolvers
- `zod` - TypeScript-first schema validation

### Data & State
- `@tanstack/react-query` - Server state management
- `@tanstack/react-table` - Advanced table component
- `zustand` - Client state management
- `axios` - HTTP client

### Utilities
- `date-fns` - Date manipulation
- `clsx` / `tailwind-merge` - CSS class utilities
- `sonner` - Toast notifications
- `recharts` - Data visualization
- `react-day-picker` - Date picker component

## Development Workflow

### Code Quality
- **ESLint** - Enforces consistent code style
- **Prettier** - Auto-formats code
- **TypeScript** - Catches type errors

Run quality checks:
```bash
pnpm lint
pnpm format:check
```

Auto-fix issues:
```bash
pnpm format
```

### Type Safety
Ensure all code is properly typed with TypeScript. Run type checking during build:
```bash
pnpm build
```

### Component Development
1. Use shadcn/ui components as the base
2. Extend with custom styles using Tailwind CSS
3. Place reusable components in `src/components`
4. Feature-specific components go in their feature folder

## Features Documentation

### Attendance Module
Track employee attendance with:
- Daily check-in/check-out
- Attendance reports
- Late arrival tracking
- Absence management

### User Management
Complete user lifecycle management:
- User creation and deletion
- Role and permission assignment
- User activity logs
- Bulk operations

### Task Management
Collaborative task tracking:
- Create tasks with descriptions
- Assign to team members
- Set priorities and deadlines
- Track progress with status updates

### Approval Workflow
Streamlined approval process:
- Submit requests for approval
- Multi-level approval chains
- Approval history and audit logs
- Notification system

## Performance Optimization

- **Code Splitting** - TanStack Router handles automatic code splitting
- **Lazy Loading** - Components load on-demand
- **Caching** - React Query manages server state caching
- **Debouncing** - Search and form inputs are debounced
- **Image Optimization** - Static assets are optimized by Vite

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Create a feature branch from `main`
2. Ensure code passes linting: `pnpm lint`
3. Format code: `pnpm format`
4. Write meaningful commit messages
5. Submit a pull request with a clear description

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support & Resources

- **Documentation** - Check the inline code comments and type definitions
- **Components** - Browse shadcn/ui component examples
- **Issues** - Report bugs or request features via GitHub Issues

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

Built with ❤️ using modern React technologies and the power of shadcn/ui components.
