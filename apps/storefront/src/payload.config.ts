import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { Media } from './collections/Media';
import { Pages } from './collections/Pages';

export const PAYLOAD_SCHEMA_NAME = 'payload';

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? 'ziro-payload-dev-secret',
  editor: lexicalEditor(),
  collections: [Pages, Media],
  db: postgresAdapter({
    schemaName: PAYLOAD_SCHEMA_NAME,
    pool: {
      connectionString:
        process.env.DATABASE_URL ?? 'postgresql://ziro:ziro@localhost:5432/ziro',
    },
  }),
  typescript: {
    outputFile: 'src/payload-types.ts',
  },
});
