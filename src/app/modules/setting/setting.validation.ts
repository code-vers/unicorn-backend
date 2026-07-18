import { z } from 'zod';

const createSettingZodSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
    description: z.string().optional()
  })
});

const updateSettingZodSchema = z.object({
  body: z.object({
    value: z.string().min(1, 'Value is required'),
    description: z.string().optional()
  })
});

export const SettingValidation = {
  createSettingZodSchema,
  updateSettingZodSchema
};
