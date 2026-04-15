# Anti-Verse – Frontend Architecture

## 1. Overview

The Anti-Verse client is a **React 18** single-page application built with **Vite**, styled with **Tailwind CSS v3 + DaisyUI**, state managed by **Zustand**, and routed with **React Router v6**. Data visualizations use **Apex Charts**.

### Core Principles

1. **Component-Driven**: Build small, focused, reusable components. Pages compose components.
2. **Theme-Driven Styling**: All colors from the DaisyUI theme. No hardcoded hex/rgb values.
3. **Store per Domain**: One Zustand store per backend domain (auth, colony, log, media).
4. **API Layer Separation**: All HTTP calls go through `src/utils/api.ts`. Components never call `fetch`/`axios` directly.
5. **Type Safety**: All props, store state, and API responses are fully typed with TypeScript.

---

## 2. Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18.x | UI library |
| Vite | 5.x | Dev server + bundler |
| TypeScript | 5.x | Type safety |
| React Router | 6.x | Client-side routing |
| Tailwind CSS | 3.x | Utility-first CSS |
| DaisyUI | 4.x | Tailwind component library |
| Zustand | 4.x | State management |
| react-apexcharts | 1.x | Data visualization |
| Axios | 1.x | HTTP client |
| react-hook-form | 7.x | Form handling |
| Zod | 3.x | Form validation (client-side) |
| date-fns | 3.x | Date formatting & manipulation |
| react-dropzone | 14.x | Drag-and-drop file upload |
| react-hot-toast | 2.x | Toast notifications |

---

## 3. Project Structure

```
client/
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── common/                    # Shared UI primitives
│   │   │   ├── Layout.tsx             # App shell (sidebar + content)
│   │   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   │   ├── Navbar.tsx             # Top bar (breadcrumbs, user menu)
│   │   │   ├── ProtectedRoute.tsx     # Auth guard wrapper
│   │   │   ├── RoleGuard.tsx          # Role-based content guard
│   │   │   ├── EmptyState.tsx         # "No data" placeholder
│   │   │   ├── LoadingSpinner.tsx     # Loading indicator
│   │   │   ├── Pagination.tsx         # Pagination controls
│   │   │   ├── ConfirmModal.tsx       # Confirmation dialog
│   │   │   ├── SearchInput.tsx        # Debounced search box
│   │   │   └── StatCard.tsx           # Dashboard statistic card
│   │   │
│   │   ├── colony/
│   │   │   ├── ColonyCard.tsx         # Colony summary card (grid)
│   │   │   ├── ColonyForm.tsx         # Create/edit colony form
│   │   │   ├── ColonyStatusBadge.tsx  # Status pill (active/inactive/deceased)
│   │   │   ├── ColonyHeader.tsx       # Colony detail page header
│   │   │   ├── MemberList.tsx         # Collaboration members list
│   │   │   ├── MemberInviteModal.tsx  # Invite user to colony
│   │   │   ├── SpeciesSelect.tsx      # Species dropdown with search
│   │   │   └── PopulationChart.tsx    # Worker count over time (Apex)
│   │   │
│   │   ├── log/
│   │   │   ├── LogEntryCard.tsx       # Log entry in timeline
│   │   │   ├── LogEntryForm.tsx       # Create/edit log entry form
│   │   │   ├── LogTimeline.tsx        # Chronological entry list
│   │   │   ├── LogFilter.tsx          # Filter by type, date range
│   │   │   ├── EnvironmentalForm.tsx  # Temp/humidity/light input
│   │   │   ├── EnvironmentalChart.tsx # Time-series env chart (Apex)
│   │   │   └── ExportButton.tsx       # CSV/JSON export trigger
│   │   │
│   │   └── media/
│   │       ├── MediaGrid.tsx          # Photo/video grid gallery
│   │       ├── MediaCard.tsx          # Single media thumbnail
│   │       ├── MediaUploader.tsx      # Drag-and-drop upload area
│   │       ├── MediaViewer.tsx        # Lightbox/fullscreen viewer
│   │       └── MediaFilter.tsx        # Filter by type (image/video)
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx              # Overview: colony count, recent activity
│   │   ├── Login.tsx                  # Login form
│   │   ├── Register.tsx               # Registration form
│   │   ├── ColonyList.tsx             # All colonies (grid + search + filter)
│   │   ├── ColonyDetail.tsx           # Single colony (tabs: overview, logs, media, members)
│   │   ├── LogEntries.tsx             # Colony log timeline + charts
│   │   ├── MediaGallery.tsx           # Colony media gallery
│   │   ├── Settings.tsx               # User profile & preferences
│   │   ├── AdminUsers.tsx             # Admin: user management
│   │   └── NotFound.tsx               # 404 page
│   │
│   ├── stores/
│   │   ├── authStore.ts               # Auth state + actions
│   │   ├── colonyStore.ts             # Colony list/detail state
│   │   ├── logStore.ts                # Log entries + env data state
│   │   ├── mediaStore.ts              # Media list + upload state
│   │   └── uiStore.ts                 # UI state (sidebar, theme, modals)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 # Convenience hook for authStore
│   │   ├── useDebounce.ts             # Debounced value hook
│   │   ├── usePagination.ts           # Pagination state hook
│   │   └── useMediaUpload.ts          # S3 pre-signed upload hook
│   │
│   ├── utils/
│   │   ├── api.ts                     # Axios instance + interceptors
│   │   ├── auth.ts                    # Token storage helpers
│   │   ├── formatters.ts             # Date, number, file size formatters
│   │   ├── validators.ts             # Zod schemas for forms
│   │   └── constants.ts              # App-wide constants
│   │
│   ├── types/
│   │   ├── index.ts                   # Re-export from @antiverse/types
│   │   └── ui.ts                      # Client-only types (form state, etc.)
│   │
│   ├── App.tsx                        # Root: providers + router
│   ├── main.tsx                       # Entry point: render App
│   └── index.css                      # Tailwind directives
│
├── tailwind.config.js                 # Extends @antiverse/tailwind-config
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Routing

### Route Definition

```tsx
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes (require authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/colonies" element={<ColonyList />} />
            <Route path="/colonies/:id" element={<ColonyDetail />} />
            <Route path="/colonies/:id/logs" element={<LogEntries />} />
            <Route path="/colonies/:id/media" element={<MediaGallery />} />
            <Route path="/settings" element={<Settings />} />

            {/* Admin-only routes */}
            <Route element={<RoleGuard requiredRole="admin" />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Route Map

| Path | Component | Auth | Role | Description |
|---|---|---|---|---|
| `/login` | Login | ❌ | — | Login form |
| `/register` | Register | ❌ | — | Registration form |
| `/` | Dashboard | ✅ | Any | Overview dashboard |
| `/colonies` | ColonyList | ✅ | Any | Colony grid with search/filter |
| `/colonies/:id` | ColonyDetail | ✅ | Any* | Colony overview with tabs |
| `/colonies/:id/logs` | LogEntries | ✅ | Any* | Timeline + environmental charts |
| `/colonies/:id/media` | MediaGallery | ✅ | Any* | Photo/video gallery |
| `/settings` | Settings | ✅ | Any | Profile management |
| `/admin/users` | AdminUsers | ✅ | Admin | User management table |
| `*` | NotFound | ❌ | — | 404 page |

*\* Colony access depends on colony-level role (owner/collaborator/viewer).*

---

## 5. State Management (Zustand)

### 5.1 Store Design Philosophy

- **One store per domain:** `authStore`, `colonyStore`, `logStore`, `mediaStore`, `uiStore`
- **Actions inside stores:** Each store contains its async actions (API calls).
- **No derived state duplication:** Compute derived values with selectors, don't store them.
- **Persist auth tokens:** `authStore` uses Zustand's `persist` middleware with `localStorage`.

### 5.2 Auth Store

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ error: err.response?.data?.error?.message || 'Login failed', isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await api.post('/auth/refresh', { refreshToken });
        set({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
      },

      // ... register, updateProfile, clearError
    }),
    {
      name: 'antiverse-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 5.3 Colony Store

```typescript
// stores/colonyStore.ts
interface ColonyState {
  colonies: Colony[];
  currentColony: Colony | null;
  members: ColonyMember[];
  species: Species[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchColonies: (params?: ColonyListParams) => Promise<void>;
  fetchColonyById: (id: string) => Promise<void>;
  createColony: (data: CreateColonyData) => Promise<Colony>;
  updateColony: (id: string, data: Partial<Colony>) => Promise<void>;
  deleteColony: (id: string) => Promise<void>;
  fetchMembers: (colonyId: string) => Promise<void>;
  addMember: (colonyId: string, userId: string, role: AccessRole) => Promise<void>;
  removeMember: (colonyId: string, userId: string) => Promise<void>;
  fetchSpecies: (search?: string) => Promise<void>;
}
```

### 5.4 Log Store

```typescript
// stores/logStore.ts
interface LogState {
  entries: LogEntry[];
  environmentalData: EnvironmentalReading[];
  pagination: Pagination | null;
  filters: LogFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchEntries: (colonyId: string, params?: LogListParams) => Promise<void>;
  createEntry: (colonyId: string, data: CreateLogEntry) => Promise<LogEntry>;
  updateEntry: (colonyId: string, entryId: string, data: Partial<LogEntry>) => Promise<void>;
  deleteEntry: (colonyId: string, entryId: string) => Promise<void>;
  fetchEnvironmentalData: (colonyId: string, from: string, to: string) => Promise<void>;
  exportData: (colonyId: string, format: 'csv' | 'json', params?: ExportParams) => Promise<void>;
  setFilters: (filters: Partial<LogFilters>) => void;
}
```

### 5.5 Media Store

```typescript
// stores/mediaStore.ts
interface MediaState {
  files: MediaFile[];
  uploads: UploadProgress[];   // Active upload tracking
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedia: (colonyId: string, params?: MediaListParams) => Promise<void>;
  initiateUpload: (colonyId: string, file: File, caption?: string, logEntryId?: string) => Promise<void>;
  confirmUpload: (mediaId: string) => Promise<void>;
  deleteMedia: (mediaId: string) => Promise<void>;
  updateUploadProgress: (mediaId: string, progress: number) => void;
}
```

### 5.6 UI Store

```typescript
// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  theme: 'antiverse' | 'light';
  confirmModal: { isOpen: boolean; title: string; message: string; onConfirm: () => void } | null;

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'antiverse' | 'light') => void;
  showConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  hideConfirmModal: () => void;
}
```

---

## 6. API Layer

### 6.1 Axios Instance

```typescript
// utils/api.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 → refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await useAuthStore.getState().refreshAccessToken();
        const newToken = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
```

### 6.2 Service-Specific Base URLs

Since each backend service runs on a different port, the API client dynamically routes:

```typescript
// utils/api.ts (continued)
const SERVICE_URLS = {
  auth: import.meta.env.VITE_AUTH_URL || 'http://localhost:3001/api',
  colonies: import.meta.env.VITE_COLONY_URL || 'http://localhost:3002/api',
  logs: import.meta.env.VITE_LOG_URL || 'http://localhost:3003/api',
  media: import.meta.env.VITE_MEDIA_URL || 'http://localhost:3004/api',
};

export function serviceApi(service: keyof typeof SERVICE_URLS) {
  const instance = axios.create({ ...api.defaults, baseURL: SERVICE_URLS[service] });
  // Apply same interceptors
  return instance;
}
```

---

## 7. DaisyUI Theming

### 7.1 Custom Theme

The `antiverse` theme is defined in `packages/tailwind-config` and provides a dark, scientific aesthetic:

| Token | Color | Usage |
|---|---|---|
| `primary` | `#4f46e5` (Indigo) | Primary buttons, active states, links |
| `secondary` | `#0891b2` (Cyan) | Secondary actions, headers |
| `accent` | `#f59e0b` (Amber) | Highlights, badges, attention |
| `neutral` | `#1e293b` (Slate) | Text, borders, subtle elements |
| `base-100` | `#0f172a` | Main background |
| `base-200` | `#1e293b` | Card backgrounds, sidebar |
| `base-300` | `#334155` | Elevated surfaces, inputs |
| `info` | `#3b82f6` (Blue) | Info alerts, tooltips |
| `success` | `#22c55e` (Green) | Success states, active colonies |
| `warning` | `#f59e0b` (Amber) | Warnings, inactive colonies |
| `error` | `#ef4444` (Red) | Errors, deceased colonies, destructive |

### 7.2 Theme Switching

Users can toggle between `antiverse` (dark) and `light` themes:

```tsx
// In Layout.tsx or Settings.tsx
const { theme, setTheme } = useUIStore();

// Apply via DaisyUI's data-theme attribute
<html data-theme={theme}>
```

### 7.3 Tailwind Config (Client)

```js
// client/tailwind.config.js
const baseConfig = require('@antiverse/tailwind-config');

module.exports = {
  presets: [baseConfig],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
};
```

---

## 8. Key Component Patterns

### 8.1 Colony Card (Example Component)

```tsx
// components/colony/ColonyCard.tsx
interface ColonyCardProps {
  colony: Colony;
  onClick: (id: string) => void;
}

export function ColonyCard({ colony, onClick }: ColonyCardProps) {
  return (
    <div
      className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow
                 duration-300 cursor-pointer border border-base-300
                 hover:border-primary/30"
      onClick={() => onClick(colony.id)}
    >
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-lg">{colony.name}</h3>
          <ColonyStatusBadge status={colony.status} />
        </div>

        <p className="text-sm text-base-content/60">
          {colony.species.scientificName}
        </p>

        <div className="flex gap-4 mt-3 text-sm text-base-content/70">
          <span className="flex items-center gap-1">
            👑 {colony.queenCount} queen{colony.queenCount !== 1 ? 's' : ''}
          </span>
          {colony.estimatedWorkerCount && (
            <span className="flex items-center gap-1">
              🐜 ~{colony.estimatedWorkerCount.toLocaleString()} workers
            </span>
          )}
        </div>

        <div className="card-actions justify-end mt-2">
          <span className="text-xs text-base-content/40">
            Founded {formatDate(colony.foundingDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 Environmental Chart (Apex Charts Example)

```tsx
// components/log/EnvironmentalChart.tsx
import Chart from 'react-apexcharts';
import { useLogStore } from '../../stores/logStore';

export function EnvironmentalChart({ colonyId }: { colonyId: string }) {
  const { environmentalData } = useLogStore();

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    theme: { mode: 'dark' },
    colors: ['#ef4444', '#3b82f6', '#f59e0b'], // temp, humidity, light
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } },
    },
    yaxis: [
      { title: { text: 'Temperature (°C)' }, labels: { style: { colors: '#ef4444' } } },
      { title: { text: 'Humidity (%)' }, opposite: true, labels: { style: { colors: '#3b82f6' } } },
    ],
    legend: { position: 'top', labels: { colors: '#e2e8f0' } },
    grid: { borderColor: '#334155' },
    tooltip: { theme: 'dark' },
  };

  const series = [
    { name: 'Temperature', data: environmentalData.map(d => ({ x: d.recordedAt, y: d.temperature })) },
    { name: 'Humidity', data: environmentalData.map(d => ({ x: d.recordedAt, y: d.humidity })) },
    { name: 'Light', data: environmentalData.map(d => ({ x: d.recordedAt, y: d.lightLevel })) },
  ];

  return (
    <div className="card bg-base-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Environmental Conditions</h3>
      <Chart options={options} series={series} type="line" height={350} />
    </div>
  );
}
```

---

## 9. Responsive Design Strategy

### Breakpoints (Tailwind defaults)

| Breakpoint | Width | Target |
|---|---|---|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large monitors |

### Layout Behavior

| Viewport | Sidebar | Content | Colony Grid |
|---|---|---|---|
| `< md` | Hidden (hamburger toggle, overlay) | Full width | 1 column |
| `md – lg` | Collapsed (icons only, 64px) | Flexible | 2 columns |
| `>= lg` | Expanded (256px) | Flexible | 3 columns |
| `>= xl` | Expanded (256px) | Max-width 1280px, centered | 4 columns |

### Mobile-First Classes Example

```html
<!-- Colony grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <!-- ColonyCard components -->
</div>
```

---

## 10. Accessibility (a11y)

| Area | Approach |
|---|---|
| **Keyboard Navigation** | All interactive elements focusable. Tab order follows visual order. Modal traps focus. |
| **ARIA Labels** | Buttons with icons have `aria-label`. Form inputs have associated `<label>`. |
| **Color Contrast** | Minimum 4.5:1 for body text, 3:1 for large text (WCAG AA). |
| **Screen Reader** | Status changes announced with `aria-live="polite"`. Loading states use `aria-busy`. |
| **Reduced Motion** | Respect `prefers-reduced-motion`: disable animations via `motion-safe:` prefix. |
| **Alt Text** | All `<img>` elements have descriptive `alt` attributes. Decorative images use `alt=""`. |
| **Focus Indicators** | Visible focus rings on all interactive elements (DaisyUI default + customized). |

---

## 11. Performance Considerations

| Technique | Implementation |
|---|---|
| **Code Splitting** | `React.lazy()` for route-level components. Suspense with loading fallback. |
| **Image Optimization** | S3 URLs served with appropriate cache headers. `loading="lazy"` on media gallery images. |
| **Debounced Search** | 300ms debounce on search inputs to reduce API calls. |
| **Paginated Lists** | All lists paginated server-side (20 items default). No infinite scroll initially. |
| **Memoization** | `React.memo()` on expensive list items (ColonyCard, LogEntryCard). `useMemo` for chart data transforms. |
| **Bundle Size** | Monitor with `vite-plugin-visualizer`. Tree-shake unused DaisyUI components. |
