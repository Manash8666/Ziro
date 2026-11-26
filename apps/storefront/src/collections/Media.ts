import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: ({ req }) => {
      const tenantId = (req.user as { tenantId?: string } | null)?.tenantId;
      if (!tenantId) return true;
      return { tenantId: { equals: tenantId } };
    },
  },
  upload: true,
  fields: [
    {
      name: 'tenantId',
      type: 'text',
      required: true,
      defaultValue: 'default',
      index: true,
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
};
