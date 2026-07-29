import prisma from '../../utils/prisma';
import { ActivityLog, ActivityType, ActivityStatus } from '@prisma/client';

const getRecentActivity = async (limit: number = 10) => {
  const activities = await prisma.activityLog.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
  
  return activities.map(act => ({
    id: act.id,
    type: act.type.toLowerCase(),
    title: act.title,
    description: act.description,
    time: act.createdAt.toISOString(),
    status: act.status ? act.status.toLowerCase() : undefined,
  }));
};

const createActivity = async (payload: {
  type: ActivityType;
  title: string;
  description: string;
  status?: ActivityStatus;
}): Promise<ActivityLog> => {
  const activity = await prisma.activityLog.create({
    data: payload,
  });
  return activity;
};

export const ActivityService = {
  getRecentActivity,
  createActivity,
};
