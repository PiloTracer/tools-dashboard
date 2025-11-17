import { AppCard } from './AppCard';
import type { AppConfig } from '../utils/api';

interface AppGridProps {
  apps: AppConfig[];
}

/**
 * AppGrid Component
 *
 * Displays a responsive grid of application cards.
 *
 * Grid layout:
 * - Mobile (< 768px): 1 column
 * - Tablet (768px - 1024px): 2 columns
 * - Desktop (1024px - 1280px): 3 columns
 * - Large Desktop (>= 1280px): 4 columns
 */
export function AppGrid({ apps }: AppGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {apps.map((app) => (
        <AppCard key={app.client_id} app={app} />
      ))}
    </div>
  );
}
