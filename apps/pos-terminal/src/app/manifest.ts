import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ziro POS Terminal',
    short_name: 'Ziro POS',
    description: 'Zero-latency local-first counter POS and barcode warehouse scanner',
    start_url: '/',
    display: 'standalone',
    background_color: '#090B0E',
    theme_color: '#00E599',
  };
}
