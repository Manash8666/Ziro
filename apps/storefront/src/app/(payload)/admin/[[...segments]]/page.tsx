import config from '@payload-config';
import { RootPage } from '@payloadcms/next/views';

export const dynamic = 'force-dynamic';

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export default function PayloadAdminPage({ params, searchParams }: Args) {
  return RootPage({
    config,
    params,
    searchParams,
    importMap: {},
  });
}
