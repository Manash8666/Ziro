import type { CollectionConfig } from 'payload';

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    read: ({ req }) => {
      const tenantId = (req.user as { tenantId?: string } | null)?.tenantId;
      if (!tenantId) return true;
      return { tenantId: { equals: tenantId } };
    },
  },
  fields: [
    {
      name: 'tenantId',
      type: 'text',
      required: true,
      defaultValue: 'default',
      index: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'heroHeadline',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'richText',
    },
  ],
};
