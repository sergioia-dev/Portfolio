import { type DataSource, type FindOptionsWhere, Not, Raw } from "typeorm";
import Tag from "../../../../shared/database/tag/tag.entity";
import User from "../../../../shared/database/user/user.entity";

type NewTag = Pick<Tag, "id" | "name" | "filterable" | "imageUrl" | "userId">;
type TagChanges = Partial<Pick<Tag, "name" | "filterable" | "imageUrl">>;
type PageQuery = { filterable: boolean | null; limit: number; page: number };

export default class TagRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(Tag);
  }

  async findById(id: string): Promise<Tag | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserAndName(userId: string, name: string, excludeId?: string): Promise<Tag | null> {
    const where: FindOptionsWhere<Tag> = {
      userId,
      name: Raw((alias) => `LOWER(${alias}) = LOWER(:name)`, { name }),
    };
    if (excludeId != null) {
      where.id = Not(excludeId);
    }
    return this.repository.findOne({ where });
  }

  async create(tag: NewTag): Promise<Tag> {
    return this.repository.save(this.repository.create(tag));
  }

  async saveFields(id: string, changes: TagChanges): Promise<void> {
    await this.repository.update({ id }, changes);
  }

  async hardDelete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async findPage(userId: string, query: PageQuery): Promise<{ items: Tag[]; total: number }> {
    const where: FindOptionsWhere<Tag> = { userId };
    if (query.filterable != null) {
      where.filterable = query.filterable;
    }
    const [items, total] = await this.repository.findAndCount({
      where,
      order: { name: "ASC", id: "ASC" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items, total };
  }

  async findOneForUser(userId: string, id: string): Promise<Tag | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findUser(userId: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id: userId } });
  }
}
