export class QueryBuilder {
  public prismaArgs: Record<string, any> = {};
  private query: Record<string, any>;

  constructor(query: Record<string, any>) {
    this.query = query;
    this.prismaArgs.where = {};
  }

  search(searchableFields: string[]) {
    const searchTerm = this.query?.searchTerm;
    if (searchTerm && typeof searchTerm === 'string') {
      this.prismaArgs.where.OR = searchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }));
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
    const excludeFields = ['searchTerm', 'page', 'limit', 'sortBy', 'sortOrder'];
    excludeFields.forEach((el) => delete queryObj[el]);

    if (Object.keys(queryObj).length > 0) {
      this.prismaArgs.where = {
        ...this.prismaArgs.where,
        ...queryObj
      };
    }

    // Clean up empty where object if nothing was added
    if (Object.keys(this.prismaArgs.where).length === 0) {
      delete this.prismaArgs.where;
    }

    return this;
  }

  sort() {
    const sortBy = (this.query?.sortBy as string) || 'createdAt';
    const sortOrder = (this.query?.sortOrder as string) || 'desc';

    this.prismaArgs.orderBy = {
      [sortBy]: sortOrder
    };
    return this;
  }

  paginate() {
    const page = Number(this.query?.page) || 1;
    const limit = Number(this.query?.limit) || 10;
    const skip = (page - 1) * limit;

    this.prismaArgs.skip = skip;
    this.prismaArgs.take = limit;

    return this;
  }

  build() {
    // If where is completely empty after all operations, remove it
    if (this.prismaArgs.where && Object.keys(this.prismaArgs.where).length === 0) {
      delete this.prismaArgs.where;
    }
    return this.prismaArgs;
  }
}
