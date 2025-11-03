import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function OnboardingRedirect({ children }: { children: React.ReactNode }) {
  const { hasCompanyDetails, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasCompanyDetails) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
