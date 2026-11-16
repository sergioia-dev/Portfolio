import { type DataSource, type FindOptionsWhere, Not, Raw } from "typeorm";
import Certification from "../../../../shared/database/certification/certification.entity";
import User from "../../../../shared/database/user/user.entity";

type NewCertification = Pick<
  Certification,
  "id" | "title" | "description" | "documentUrl" | "userId"
>;
type CertificationChanges = Partial<Pick<Certification, "title" | "description" | "documentUrl">>;
type PageQuery = { limit: number; page: number };

export default class CertificationRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(Certification);
  }

  async findById(id: string): Promise<Certification | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserAndTitle(
    userId: string,
    title: string,
    excludeId?: string,
  ): Promise<Certification | null> {
    const where: FindOptionsWhere<Certification> = {
      userId,
      title: Raw((alias) => `LOWER(${alias}) = LOWER(:title)`, { title }),
    };
    if (excludeId != null) {
      where.id = Not(excludeId);
    }
    return this.repository.findOne({ where });
  }

  async create(certification: NewCertification): Promise<Certification> {
    return this.repository.save(this.repository.create(certification));
  }

  async saveFields(id: string, changes: CertificationChanges): Promise<void> {
    await this.repository.update({ id }, changes);
  }

  async hardDelete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async findPage(
    userId: string,
    query: PageQuery,
  ): Promise<{ items: Certification[]; total: number }> {
    const [items, total] = await this.repository.findAndCount({
      where: { userId },
      order: { title: "ASC", id: "ASC" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items, total };
  }

  async findOneForUser(userId: string, id: string): Promise<Certification | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findUser(userId: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id: userId } });
  }
}
