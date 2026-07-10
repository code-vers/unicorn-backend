import { z } from 'zod';

const changeRole = z.object({
  body: z
    .object({
      role: z.enum(['USER', 'ADMIN'], {
        message: 'Invalid role. Must be USER or ADMIN.'
      })
    })
    .strict()
});

export const UserValidation = {
  changeRole
};
