import { useAuth } from '../contexts/AuthContext';
import * as Avatar from '@radix-ui/react-avatar';
import * as Label from '@radix-ui/react-label';
import { DateTime } from 'luxon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/Tabs';
import { Separator } from '../components/Separator';
import { Progress } from '../components/Progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/Dialog';
import { Button } from '../components/Button';
import { useState, useCallback } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

// Helper function to create cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Resize to a maximum of 250x250 for profile photos
  const maxSize = 250;
  const scale = Math.min(maxSize / pixelCrop.width, maxSize / pixelCrop.height);
  const outputWidth = Math.round(pixelCrop.width * scale);
  const outputHeight = Math.round(pixelCrop.height * scale);

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Use high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

export function Profile() {
  const { user, company, refreshUser, refreshCompany } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Company editing state
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    kvk: '',
    btw: '',
    iban: '',
    address: '',
  });

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED);
  };

  const profileCompletion = user?.name && user?.email && user?.picture ? 100 : 75;

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!previewUrl || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      // Get the cropped image as a blob
      const croppedImageBlob = await getCroppedImg(previewUrl, croppedAreaPixels);

      // Create a file from the blob
      const croppedFile = new File([croppedImageBlob], selectedFile?.name || 'profile.jpg', {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('photo', croppedFile);

      await axios.post('/api/users/me/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh user data to get new photo URL
      await refreshUser();

      // Close dialog and reset state
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const openCompanyDialog = () => {
    // Pre-fill form with existing company data
    if (company) {
      setCompanyFormData({
        name: company.name,
        kvk: company.kvk,
        btw: company.btw,
        iban: company.iban,
        address: company.address,
      });
    }
    setCompanyDialogOpen(true);
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCompanyFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCompany(true);

    try {
      await axios.put('/api/users/me/company', companyFormData);
      await refreshCompany();
      setCompanyDialogOpen(false);
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company details. Please try again.');
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Profile Header Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar.Root className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-purple-500 shadow-xl">
                  <Avatar.Image src={user?.picture || undefined} alt={user?.name || undefined} className="h-full w-full object-cover" />
                  <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 text-4xl font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Avatar.Fallback>
                </Avatar.Root>

                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Update Profile Photo</DialogTitle>
                      <DialogDescription>
                        {previewUrl ? 'Adjust the crop area and zoom, then upload.' : 'Upload a new photo for your profile. Max size 5MB.'}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {previewUrl ? (
                        <div className="space-y-4">
                          {/* Cropper Area */}
                          <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                            <Cropper
                              image={previewUrl}
                              crop={crop}
                              zoom={zoom}
                              aspect={1}
                              cropShape="round"
                              showGrid={false}
                              onCropChange={setCrop}
                              onCropComplete={onCropComplete}
                              onZoomChange={setZoom}
                            />
                          </div>

                          {/* Zoom Control */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label.Root className="text-sm font-medium text-gray-700">
                                Zoom
                              </Label.Root>
                              <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              value={zoom}
                              min={1}
                              max={3}
                              step={0.1}
                              onChange={(e) => setZoom(Number(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                          </div>

                          {/* Change Photo Button */}
                          <div className="flex justify-center">
                            <label htmlFor="photo-upload-change" className="cursor-pointer">
                              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700">
                                  Choose Different Photo
                                </span>
                              </div>
                              <input
                                id="photo-upload-change"
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                          <label htmlFor="photo-upload" className="cursor-pointer">
                            <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
                              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-900">Click to upload</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  JPG, PNG, GIF, WebP (max 5MB)
                                </p>
                              </div>
                            </div>
                            <input
                              id="photo-upload"
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadDialogOpen(false);
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setCrop({ x: 0, y: 0 });
                          setZoom(1);
                          setCroppedAreaPixels(null);
                        }}
                        disabled={isUploading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || !croppedAreaPixels || isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900">{user?.name || 'Anonymous User'}</h1>
                <p className="mt-1 text-lg text-gray-600">{user?.email}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label.Root className="text-sm font-medium text-gray-700">
                      Profile Completion
                    </Label.Root>
                    <span className="text-sm font-semibold text-purple-600">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your basic account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label.Root className="text-sm font-medium text-gray-700">Full Name</Label.Root>
                    <p className="mt-1 text-gray-900 font-medium">{user?.name || 'Not provided'}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label.Root className="text-sm font-medium text-gray-700">Email Address</Label.Root>
                    <p className="mt-1 text-gray-900 font-medium">{user?.email}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label.Root className="text-sm font-medium text-gray-700">Profile Picture</Label.Root>
                    <p className="mt-1 text-gray-600 text-sm">
                      {user?.picture ? 'Configured' : 'Not set'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Timeline</CardTitle>
                  <CardDescription>Important dates for your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label.Root className="text-sm font-medium text-gray-700">Member Since</Label.Root>
                    <p className="mt-1 text-gray-900 font-medium">{formatDate(user?.createdAt)}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label.Root className="text-sm font-medium text-gray-700">Last Updated</Label.Root>
                    <p className="mt-1 text-gray-900 font-medium">{formatDate(user?.updatedAt)}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label.Root className="text-sm font-medium text-gray-700">Account Status</Label.Root>
                    <div className="mt-1 items-center">
                      <div className="h-2 w-2 inline-flex mr-1 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-700">Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>Your business details for invoicing and bookkeeping</CardDescription>
                  </div>
                  <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCompanyDialog} size="sm">
                        Edit Company Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Company Details</DialogTitle>
                        <DialogDescription>
                          Update your company information for invoices and reports.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleCompanySubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label.Root htmlFor="company-name">Company Name</Label.Root>
                          <input
                            id="company-name"
                            name="name"
                            type="text"
                            required
                            value={companyFormData.name}
                            onChange={handleCompanyChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label.Root htmlFor="company-kvk">KvK Nummer</Label.Root>
                            <input
                              id="company-kvk"
                              name="kvk"
                              type="text"
                              required
                              value={companyFormData.kvk}
                              onChange={handleCompanyChange}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label.Root htmlFor="company-btw">BTW-nummer</Label.Root>
                            <input
                              id="company-btw"
                              name="btw"
                              type="text"
                              required
                              value={companyFormData.btw}
                              onChange={handleCompanyChange}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label.Root htmlFor="company-iban">IBAN</Label.Root>
                          <input
                            id="company-iban"
                            name="iban"
                            type="text"
                            required
                            value={companyFormData.iban}
                            onChange={handleCompanyChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label.Root htmlFor="company-address">Company Address</Label.Root>
                          <textarea
                            id="company-address"
                            name="address"
                            required
                            value={companyFormData.address}
                            onChange={handleCompanyChange}
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCompanyDialogOpen(false)}
                            disabled={isUpdatingCompany}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isUpdatingCompany}>
                            {isUpdatingCompany ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {company ? (
                  <>
                    <div>
                      <Label.Root className="text-sm font-medium text-gray-700">Company Name</Label.Root>
                      <p className="mt-1 text-gray-900 font-medium">{company.name}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label.Root className="text-sm font-medium text-gray-700">KvK Nummer</Label.Root>
                        <p className="mt-1 text-gray-900 font-medium font-mono">{company.kvk}</p>
                      </div>

                      <div>
                        <Label.Root className="text-sm font-medium text-gray-700">BTW-nummer</Label.Root>
                        <p className="mt-1 text-gray-900 font-medium font-mono">{company.btw}</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label.Root className="text-sm font-medium text-gray-700">IBAN</Label.Root>
                      <p className="mt-1 text-gray-900 font-medium font-mono">{company.iban}</p>
                    </div>

                    <Separator />

                    <div>
                      <Label.Root className="text-sm font-medium text-gray-700">Company Address</Label.Root>
                      <p className="mt-1 text-gray-900 font-medium whitespace-pre-line">{company.address}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label.Root className="text-sm font-medium text-gray-700">Created</Label.Root>
                        <p className="mt-1 text-gray-900 font-medium">{formatDate(company.createdAt)}</p>
                      </div>

                      <div>
                        <Label.Root className="text-sm font-medium text-gray-700">Last Updated</Label.Root>
                        <p className="mt-1 text-gray-900 font-medium">{formatDate(company.updatedAt)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">No company details available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
                <CardDescription>System identifiers and authentication information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label.Root className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    User ID
                  </Label.Root>
                  <div className="mt-2 rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-900 break-all border border-gray-200">
                    {user?.id}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label.Root className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Auth0 ID
                  </Label.Root>
                  <div className="mt-2 rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-900 break-all border border-gray-200">
                    {user?.auth0Id}
                  </div>
                </div>

                <Separator />

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Authentication Provider</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Your account is secured using Auth0 authentication with OAuth 2.0 protocol.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent account activities and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Profile Created</p>
                      <p className="text-sm text-gray-600">{formatDate(user?.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Profile Updated</p>
                      <p className="text-sm text-gray-600">{formatDate(user?.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
