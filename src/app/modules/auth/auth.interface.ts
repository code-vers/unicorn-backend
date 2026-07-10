import type { UserRole } from '../../interfaces/auth.interface';

export interface IUserRegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'USER';
}

export interface IUserLoginPayload {
  email: string;
  password: string;
}

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: IUserResponse;
}

export interface IRefreshTokenResponse {
  accessToken: string;
}

export interface IChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IVerifyResetCodePayload {
  email: string;
  code: string;
}

export interface IResetPasswordPayload {
  token: string;
  newPassword: string;
}
