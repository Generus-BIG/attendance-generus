# MuMiBig Attendance Dashboard

A streamlined, high-performance administration dashboard built with **React 19**, **TypeScript**, and **shadcn/ui**. This platform is tailored for managing attendance, participant registries, and operational data for MuMiBig.

## 🚀 Key Features

- **Attendance Tracking** – Comprehensive logging with mobile-optimized entry forms.
- **Real-time Analytics** – Visualized metrics and status cards for performance monitoring.
- **Participant Management** – Integrated database for tracking group-based attendance.
- **Form System** – Dynamic form handling for public submissions and administrative updates.
- **Responsive UI** – A mobile-first approach using **Tailwind CSS 4** and modern design patterns.
- **Light/Dark Mode** – Flexible theme support with a default light mode configuration.

## 🛠 Tech Stack

- **Framework:** React 19 + Vite 7
- **Routing:** TanStack Router (Type-safe, file-based routing)
- **Data Fetching:** TanStack Query v5
- **State Management:** Zustand v5
- **Backend:** Supabase (Database & Authentication)
- **Styling:** Tailwind CSS 4, Radix UI, shadcn/ui
- **Analytics:** Vercel Analytics

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended)

### Setup

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   pnpm install
   ```

2. **Environment Variables**
   Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Run Locally**
   ```bash
   pnpm dev
   ```

## 📂 Project Structure

- `src/features/` – Core business logic and feature-specific components.
- `src/components/` – Shared UI primitives and high-level components (Tables, Layouts).
- `src/routes/` – TanStack Router route tree.
- `src/lib/` – Utilities, Supabase configuration, and Zod schemas.
- `src/context/` – React providers for global state (Theme, Layout, direction).

## 📜 Available Scripts

- `pnpm build` – Production build.
- `pnpm lint` – Code quality checks.
- `pnpm format` – Auto-format using Prettier.
- `pnpm knip` – Find unused dependencies/files.

## ⚖ License

This project is licensed under the MIT License.

---

Built with ❤️ using modern React technologies and the power of shadcn/ui components.
