import { z } from 'zod';

const register = z.object({
  body: z
    .object({
      name: z.string({ message: 'Name is required.' }).min(2, 'Name must be at least 2 characters long.'),
      email: z
        .string({ message: 'Email is required.' })
        .trim()
        .email('Email must be a valid email address.')
        .transform((value) => value.toLowerCase()),
      password: z
        .string({ message: 'Password is required.' })
        .min(8, 'Password must be at least 8 characters long.'),
      role: z.enum(['USER']).optional()
    })
    .strict()
});

const login = z.object({
  body: z
    .object({
      email: z
        .string({ message: 'Email is required.' })
        .trim()
        .email('Email must be a valid email address.')
        .transform((value) => value.toLowerCase()),
      password: z.string({ message: 'Password is required.' })
    })
    .strict()
});

const changePassword = z.object({
  body: z
    .object({
      oldPassword: z.string({ message: 'Old password is required.' }),
      newPassword: z
        .string({ message: 'New password is required.' })
        .min(8, 'Password must be at least 8 characters long.')
    })
    .strict()
});

const forgotPassword = z.object({
  body: z
    .object({
      email: z
        .string({ message: 'Email is required.' })
        .trim()
        .email('Email must be a valid email address.')
        .transform((value) => value.toLowerCase())
    })
    .strict()
});

const verifyResetCode = z.object({
  body: z
    .object({
      email: z
        .string({ message: 'Email is required.' })
        .trim()
        .email('Email must be a valid email address.')
        .transform((value) => value.toLowerCase()),
      code: z.string({ message: 'Reset code is required.' }).length(6, 'Code must be 6 digits.')
    })
    .strict()
});

const resetPassword = z.object({
  body: z
    .object({
      token: z.string({ message: 'Reset token is required.' }),
      newPassword: z
        .string({ message: 'New password is required.' })
        .min(8, 'Password must be at least 8 characters long.')
    })
    .strict()
});

const refreshToken = z.object({
  cookies: z.object({
    refreshToken: z.string({ message: 'Refresh token is required.' })
  })
});

export const AuthValidation = {
  register,
  login,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  refreshToken
};
