import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, CollectionSlug } from 'payload'
import { fileURLToPath } from 'url'
import { testEmailAdapter } from './emailAdapter'
import { firestoreAdapter } from 'payload-firestore-adapter'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    autoLogin: {
      email: 'dev@payloadcms.com',
      password: 'test',
    },
    user: 'users',
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [],
    },
    {
      slug: 'pages',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'content',
          type: 'richText',
        },
      ],
    },
    {
      slug: 'media',
      fields: [
        {
          name: 'text',
          type: 'text',
        },
      ],
      upload: true,
    },
    {
      slug: 'topics',
      admin: {
        useAsTitle: 'title',
        group: "Content"
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'heroTitle',
          type: 'text',
        },
        {
          name: 'heroDescription',
          type: 'textarea',
        }
      ],
    },
    {
      slug: "books",
      versions: {
        drafts: true,
      },
      fields: [
        {
          name: 'author',
          required: true,
          label: 'Author',
          type: 'text',
        },
        {
          name: 'title',
          required: true,
          label: "Titel",
          type: 'text',
        },
        {
          name: 'publisher',
          label: 'Publisher',
          required: true,
          type: 'text',
        },
        {
          name: 'topics',
          admin: {
            position: 'sidebar',
          },
          hasMany: true,
          relationTo: 'topics' as CollectionSlug,
          type: 'relationship',
        }
      ]
    }
  ],
  globals: [ {
    slug: 'configuration',
    fields: [
      {
        name: 'heroTitle',
        type: 'text',
        required: true,
        defaultValue: '#'
      },
      {
        name: 'heroDescription',
        type: 'textarea',
        required: true,
        defaultValue: '#'
      },
      {
        name: 'heroFootnote',
        type: 'textarea',
        required: true,
        defaultValue: '#'
      }
    ],
    lockDocuments: false
  }, {
    slug: 'homepage',
    fields: [
      {
        name: 'heroTitle',
        type: 'text',
        required: true,
        defaultValue: '#'
      },
      {
        name: 'heroDescription',
        type: 'textarea',
        required: true,
        defaultValue: '#'
      },
      {
        name: 'heroFootnote',
        type: 'textarea',
        required: true,
        defaultValue: '#'
      }
    ],
    versions: {
      drafts: true,
      max: 5
    },
    lockDocuments: false
  }],
  db: firestoreAdapter({
  }),
  email: testEmailAdapter,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'SOME_SECRET',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  async onInit(payload) {
    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
    })

    if (existingUsers.docs.length === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: 'dev@payloadcms.com',
          password: 'test',
        },
      })
    }
  },
})
