import prisma from '../../utils/prisma';
import type { ISystemSettingPayload } from './setting.interface';

const publicSettingKeys = [
  'SUPPORT_PHONE',
  'WHATSAPP_PHONE',
  'SUPPORT_EMAIL',
  'OFFICE_HOURS',
  'PICKUP_INSTRUCTIONS',
  'RETURN_INSTRUCTIONS'
] as const;

const getAllSettings = async () => {
  return prisma.systemSetting.findMany();
};

const getSettingByKey = async (key: string) => {
  return prisma.systemSetting.findUnique({
    where: { key }
  });
};

const getPublicSettings = async () => {
  return prisma.systemSetting.findMany({
    where: { key: { in: [...publicSettingKeys] } },
    select: { key: true, value: true, description: true }
  });
};

const upsertSetting = async (payload: ISystemSettingPayload) => {
  return prisma.systemSetting.upsert({
    where: { key: payload.key },
    update: {
      value: payload.value,
      description: payload.description
    },
    create: {
      key: payload.key,
      value: payload.value,
      description: payload.description
    }
  });
};

const deleteSetting = async (key: string) => {
  return prisma.systemSetting.delete({
    where: { key }
  });
};

export const SettingService = {
  getAllSettings,
  getSettingByKey,
  getPublicSettings,
  upsertSetting,
  deleteSetting
};
