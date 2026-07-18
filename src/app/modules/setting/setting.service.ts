import prisma from '../../utils/prisma';
import type { ISystemSettingPayload } from './setting.interface';

const getAllSettings = async () => {
  return prisma.systemSetting.findMany();
};

const getSettingByKey = async (key: string) => {
  return prisma.systemSetting.findUnique({
    where: { key }
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
  upsertSetting,
  deleteSetting
};
