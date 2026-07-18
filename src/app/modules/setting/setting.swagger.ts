export const settingSwaggerPaths = {
  '/api/v1/settings': {
    get: {
      tags: ['System Settings'],
      summary: 'Get all system settings',
      description: 'Retrieve all system settings (Admin only)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Settings retrieved successfully'
        }
      }
    },
    post: {
      tags: ['System Settings'],
      summary: 'Create or update a system setting',
      description: 'Create a new setting or update if it exists (Admin only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                key: { type: 'string', example: 'TAX_PERCENTAGE' },
                value: { type: 'string', example: '16.00' },
                description: { type: 'string', example: 'VAT Tax percentage' }
              },
              required: ['key', 'value']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Setting updated successfully'
        }
      }
    }
  },
  '/api/v1/settings/{key}': {
    get: {
      tags: ['System Settings'],
      summary: 'Get a setting by key',
      description: 'Retrieve a specific setting value',
      parameters: [
        {
          name: 'key',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Setting retrieved successfully'
        }
      }
    },
    delete: {
      tags: ['System Settings'],
      summary: 'Delete a system setting',
      description: 'Delete a setting by key (Admin only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'key',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Setting deleted successfully'
        }
      }
    }
  }
};
