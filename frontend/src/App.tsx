import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OnboardingRedirect } from './components/OnboardingRedirect';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Invoices } from './pages/Invoices';
import { VatDeclaration } from './pages/VatDeclaration';
import { ProfitLoss } from './pages/ProfitLoss';
import { Assets } from './pages/Assets';
import BalanceSheet from './pages/BalanceSheet';
import { Customers } from './pages/Customers';
import CompanyOnboarding from './pages/CompanyOnboarding';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <CompanyOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <Dashboard />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <Profile />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <Invoices />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vat-declaration"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <VatDeclaration />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profit-loss"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <ProfitLoss />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <Assets />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/balance-sheet"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <BalanceSheet />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <OnboardingRedirect>
                    <Customers />
                  </OnboardingRedirect>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
