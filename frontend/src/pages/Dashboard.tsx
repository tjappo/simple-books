import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import { animate } from 'motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Separator } from '../components/Separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/Tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../components/HoverCard';
import { Button } from '../components/Button';
import * as Avatar from '@radix-ui/react-avatar';

export function Dashboard() {
  const { user: dbUser, company, isLoading: loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach((card, index) => {
      animate(
        card,
        { opacity: [0, 1], y: [20, 0] },
        { duration: 0.5, delay: index * 0.1 }
      );
    });
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-base text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const memberSince = dbUser?.createdAt
    ? DateTime.fromISO(dbUser.createdAt).toLocaleString(DateTime.DATE_MED)
    : 'N/A';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-10">
            <div className="flex items-center gap-6 mb-6">
              <HoverCard>
                <HoverCardTrigger>
                  <Avatar.Root className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-white shadow-lg cursor-pointer transition-transform hover:scale-105">
                    <Avatar.Image src={dbUser?.picture || undefined} alt={dbUser?.name || undefined} className="h-full w-full object-cover" />
                    <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">
                      {dbUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </Avatar.Fallback>
                  </Avatar.Root>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="flex gap-4">
                    <Avatar.Root className="h-12 w-12 overflow-hidden rounded-full">
                      <Avatar.Image src={dbUser?.picture || undefined} alt={dbUser?.name || undefined} className="h-full w-full object-cover" />
                      <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white">
                        {dbUser?.name?.charAt(0).toUpperCase() || 'U'}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div>
                      <h4 className="text-sm font-semibold">{dbUser?.name}</h4>
                      <p className="text-sm text-gray-600">{dbUser?.email}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Member since {DateTime.fromISO(dbUser?.createdAt || '').toFormat('MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Welcome back, {dbUser?.name?.split(' ')[0] || 'User'}!
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Here's what's happening with your account today.
                </p>
              </div>
            </div>
          </div>

        {/* Company Information */}
        {company && (
          <Card className="stat-card mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Company Information</CardTitle>
                  <CardDescription>Your registered company details</CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate('/onboarding')}>
                  Edit Company Info
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Company Name</p>
                  <p className="text-lg font-medium text-gray-900">{company.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">KvK Number</p>
                  <p className="text-lg font-medium text-gray-900">{company.kvk}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">BTW Number</p>
                  <p className="text-lg font-medium text-gray-900">{company.btw}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">IBAN</p>
                  <p className="text-lg font-mono text-gray-900">{company.iban}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Address</p>
                  <p className="text-lg text-gray-900 whitespace-pre-line">{company.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardDescription className="text-blue-100 text-xs uppercase font-semibold tracking-wider">
                    Email Address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold break-all">{dbUser?.email}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your primary contact email</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="stat-card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardDescription className="text-indigo-100 text-xs uppercase font-semibold tracking-wider">
                    Full Name
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dbUser?.name || 'Not provided'}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your display name across the platform</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="stat-card bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 cursor-pointer">
                <CardHeader className="pb-3">
                  <CardDescription className="text-purple-100 text-xs uppercase font-semibold tracking-wider">
                    Member Since
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{memberSince}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Account creation date</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Detailed Information Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="stat-card">
            <CardHeader>
              <CardTitle className="text-2xl">Account Details</CardTitle>
              <CardDescription>Your account identification and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">User ID</span>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-900 break-all border border-gray-200">
                  {dbUser?.id}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Auth0 ID</span>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-900 break-all border border-gray-200">
                  {dbUser?.auth0Id}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader>
              <CardTitle className="text-2xl">Quick Stats</CardTitle>
              <CardDescription>Overview of your account activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                <div>
                  <p className="text-sm font-medium text-green-900">Account Status</p>
                  <p className="text-2xl font-bold text-green-700">Active</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div>
                  <p className="text-sm font-medium text-blue-900">Profile Completion</p>
                  <p className="text-2xl font-bold text-blue-700">{dbUser?.name ? '100%' : '80%'}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
