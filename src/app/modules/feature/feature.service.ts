import prisma from '../../utils/prisma';
import { QueryBuilder } from '../../utils/QueryBuilder';
import { IFeaturePayload, IFeatureQuery, IFeatureUpdatePayload } from './feature.interface';
import AppError from '../../errors/AppError';

const createFeature = async (payload: IFeaturePayload) => {
  return prisma.feature.create({
    data: payload
  });
};

const getAllFeatures = async (query: IFeatureQuery) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['name'])
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();
  
  // Custom filter for isAddon boolean
  const whereClause: any = { ...builtQuery.where };
  if (query.isAddon !== undefined) {
    whereClause.isAddon = query.isAddon === 'true' || query.isAddon === true;
  }

  const data = await prisma.feature.findMany({
    ...builtQuery,
    where: whereClause
  });

  const total = await prisma.feature.count({ where: whereClause });
  const take = builtQuery.take || 10;
  const skip = builtQuery.skip || 0;

  return {
    meta: {
      page: skip / take + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    },
    data
  };
};

const getFeatureById = async (id: string) => {
  const feature = await prisma.feature.findUnique({ where: { id } });
  if (!feature) throw new AppError(404, 'Feature not found');
  return feature;
};

const updateFeature = async (id: string, payload: IFeatureUpdatePayload) => {
  const feature = await prisma.feature.findUnique({ where: { id } });
  if (!feature) throw new AppError(404, 'Feature not found');

  return prisma.feature.update({
    where: { id },
    data: payload
  });
};

const deleteFeature = async (id: string) => {
  const feature = await prisma.feature.findUnique({ where: { id } });
  if (!feature) throw new AppError(404, 'Feature not found');

  return prisma.feature.delete({ where: { id } });
};

export const FeatureService = {
  createFeature,
  getAllFeatures,
  getFeatureById,
  updateFeature,
  deleteFeature
};
