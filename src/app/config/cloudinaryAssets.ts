export const cloudinaryAssets = {
  '/Assets/fondo-home-m.png': 'https://res.cloudinary.com/dqr1ehkv7/image/upload/v1775593892/modern-fashion-store/fondo-home-m.png',
  '/Assets/fondo-home.png': 'https://res.cloudinary.com/dqr1ehkv7/image/upload/v1775593894/modern-fashion-store/fondo-home.png',
  '/Assets/logo-b.png': 'https://res.cloudinary.com/dqr1ehkv7/image/upload/v1775593895/modern-fashion-store/logo-b.png',
  '/Assets/logo.png': 'https://res.cloudinary.com/dqr1ehkv7/image/upload/v1775593896/modern-fashion-store/logo.png',
  '/Assets/video/francia-m.mp4': 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775593919/modern-fashion-store/video/francia-m.mp4',
  '/Assets/video/francia.mp4': 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594029/modern-fashion-store/video/francia.mp4',
  '/Assets/video/italia-m.mp4': 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594108/modern-fashion-store/video/italia-m.mp4',
  '/Assets/video/italia.mp4': 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594156/modern-fashion-store/video/italia.mp4',
} as const;

export function getCloudinaryAsset(path: string): string {
  return cloudinaryAssets[path as keyof typeof cloudinaryAssets] ?? path;
}
