# Academic Meeting Minutes - Frontend

This is the frontend application for the Academic Meeting Minutes platform. It provides a modern, responsive, and robust user interface to manage academic meetings, track meeting series, and facilitate seamless collaboration among attendees.

## Features

- **User Authentication:** Secure login, registration, and OAuth integration support. Protected routes ensure data privacy.
- **Dashboard:** A comprehensive overview of upcoming meetings, recent activities, and quick actions.
- **Meeting Management:** Create new meetings, view details, update schedules, and join active meetings. Manage meeting minutes, action items, and participants efficiently.
- **Series Management:** Organize recurring or related meetings into cohesive series for better historical tracking and continuity.
- **Advanced Search:** Integrated search functionality to quickly find past meetings, specific discussions, or pending action items.
- **Profile Management:** Manage user settings and profile details.

## Technology Stack

- **Core:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/), Radix UI Pre-built primitives, Lucide React icons
- **Routing:** React Router DOM (v6 with new data router API)
- **Data Fetching & State:** `@tanstack/react-query` (React Query)
- **Forms & Validation:** React Hook Form, Zod
- **Real-time / WebSockets:** SockJS, StompJS
- **Charts / Visualizations:** Recharts

## Prerequisites

- **Node.js**: v18 or higher recommended.
- **npm** or **yarn** package manager.

## Getting Started

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Configure the necessary environment variables required for your backend API connection and OAuth providers. Create a `.env` or `.env.local` file based on your deployment needs.

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will start, usually at `http://localhost:5173`. Any changes made to the code will auto-reload the page.

## Available Scripts

- **`npm run dev`**: Starts the local development server.
- **`npm run build`**: Compiles TypeScript and builds the app for production to the `dist` folder.
- **`npm run build:dev`**: Builds the application using the development mode configuration.
- **`npm run lint`**: Runs ESLint to identify and report code quality issues.
- **`npm run preview`**: Locally previews the production build generated in the `dist` folder.

## Project Structure

```text
frontend/
├── src/
│   ├── assets/       # Static assets (images, fonts, raw styles)
│   ├── components/   # Reusable UI components (including shadcn/ui components)
│   ├── contexts/     # React Context providers (e.g., AuthContext)
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility libraries and configurations (e.g., utils for clsx/tailwind-merge)
│   ├── pages/        # Application route components (Dashboard, MeetingList, CreateMeeting, etc.)
│   ├── services/     # API service abstractions (authService, meetingService, searchService, etc.)
│   ├── types/        # TypeScript type definitions and interfaces API responses
│   ├── utils/        # Generic helper functions
│   ├── App.tsx       # Main component and application routing configuration
│   ├── main.tsx      # Application entry point and standard providers
│   └── index.css     # Global stylesheets and Tailwind directives
├── package.json      # Dependencies and NPM scripts
└── vite.config.ts    # Vite bundler configuration
```
