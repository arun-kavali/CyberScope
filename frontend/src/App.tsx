import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AlertSourceLayout } from './layouts/AlertSourceLayout';

// Public & Error Pages
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

// SOC Analyst Pages
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { InvestigationsPage } from './pages/InvestigationsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FindingsPage } from './pages/FindingsPage';
import { ReviewPrioritiesPage } from './pages/ReviewPrioritiesPage';
import { ResponsePage } from './pages/ResponsePage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';

// Alert Source Pages
import { AlertSourceSubmitPage } from './pages/AlertSourceSubmitPage';
import { AlertSourceScenariosPage } from './pages/AlertSourceScenariosPage';
import { AlertSourceHistoryPage } from './pages/AlertSourceHistoryPage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Alert Source Shell */}
              <Route
                path="/alert-source"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['ALERT_SOURCE']}>
                      <AlertSourceLayout />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              >
                <Route index element={<AlertSourceSubmitPage />} />
                <Route path="scenarios" element={<AlertSourceScenariosPage />} />
                <Route path="history" element={<AlertSourceHistoryPage />} />
              </Route>

              {/* Protected SOC Analyst Shell */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['SOC_ANALYST']}>
                      <AppLayout />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="investigations" element={<InvestigationsPage />} />
                <Route path="sources" element={<DataSourcesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="findings" element={<FindingsPage />} />
                <Route path="priorities" element={<ReviewPrioritiesPage />} />
                <Route path="response" element={<ResponsePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit" element={<AuditPage />} />
              </Route>

              {/* Global Catch-All Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
