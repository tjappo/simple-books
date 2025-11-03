import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/Dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Separator } from '../components/Separator';
import * as Avatar from '@radix-ui/react-avatar';

export function Home() {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="mx-auto max-w-4xl px-4 text-center relative z-10">
        <div className="mb-8 inline-block">
          <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h1 className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl animate-fade-in bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 leading-tight pb-2">
          Bookkeeping Made Simple
        </h1>
        <p className="mb-12 text-xl text-gray-700 max-w-2xl mx-auto">
          A modern full-stack application with secure Auth0 authentication, beautiful UI powered by Radix UI, and seamless user experience
        </p>

        {!isAuthenticated && (
          <div className="space-y-6">
            <div className="flex justify-center gap-4">
              <Button onClick={login} size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                Sign In
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Welcome to Bookkeeping</DialogTitle>
                    <DialogDescription>
                      Discover the features that make managing your finances effortless
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Secure Authentication</h4>
                        <p className="text-sm text-gray-600">Enterprise-grade security with Auth0</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Beautiful Design</h4>
                        <p className="text-sm text-gray-600">Modern UI with Radix UI primitives</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Lightning Fast</h4>
                        <p className="text-sm text-gray-600">Built with React, NestJS, and PostgreSQL</p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-12">
              <Card className="text-left hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Easy Setup</CardTitle>
                  <CardDescription>Get started in minutes with our simple onboarding</CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-left hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Real-time Insights</CardTitle>
                  <CardDescription>Track your data with live updates and analytics</CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-left hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Secure & Private</CardTitle>
                  <CardDescription>Your data is encrypted and protected at all times</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <div className="space-y-6">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar.Root className="h-16 w-16 overflow-hidden rounded-full ring-4 ring-green-500">
                    <Avatar.Image src={user?.picture || undefined} alt={user?.name || undefined} className="h-full w-full object-cover" />
                    <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-600 to-emerald-600 text-xl font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">Welcome back!</h3>
                    <p className="text-sm text-gray-600">{user?.name}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <p className="mb-4 text-gray-700">You're successfully logged in and ready to go.</p>
                <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
