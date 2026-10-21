import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { ScanCenterPage } from './pages/ScanCenterPage';
import { FindingsPage } from './pages/FindingsPage';
import { AnalystPage } from './pages/AnalystPage';
import { RemediationPage } from './pages/RemediationPage';
import { ReportsPage } from './pages/ReportsPage';
import { AutomationPage } from './pages/AutomationPage';
import { ObservabilityPage } from './pages/ObservabilityPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="repositories" element={<RepositoriesPage />} />
            <Route path="scans" element={<ScanCenterPage />} />
            <Route path="findings" element={<FindingsPage />} />
            <Route path="analyst" element={<AnalystPage />} />
            <Route path="remediation" element={<RemediationPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="automation" element={<AutomationPage />} />
            <Route path="observability" element={<ObservabilityPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
