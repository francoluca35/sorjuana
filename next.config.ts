import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'api.dicebear.com',
    pathname: '/**',
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  images: {
    remotePatterns,
  },
  // Subida de fotos/video vía Server Action (FormData); el default (~1 MB) devuelve 400 / respuesta inválida.
  experimental: {
    serverActions: {
      bodySizeLimit: '55mb',
    },
  },
};

export default nextConfig;
