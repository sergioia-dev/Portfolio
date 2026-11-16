import type { DataSource, FindOperator, FindOptionsWhere } from "typeorm";
import CertificationRepository from "../../../../src/module/portfolio/certifications/repository/certification.repository";
import Certification from "../../../../src/shared/database/certification/certification.entity";
import type User from "../../../../src/shared/database/user/user.entity";

const CERTIFICATION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const certification = {
  id: CERTIFICATION_ID,
  userId: USER_ID,
  title: "React",
  description: "Advanced",
  documentUrl: "https://storage.googleapis.com/bucket/old.pdf",
} as Certification;

const buildRepository = () => {
  const certificationQuery = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((input: unknown) => input),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const userQuery = { findOne: jest.fn() };
  const dataSource = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Certification ? certificationQuery : userQuery,
    ),
  };
  return {
    certificationQuery,
    userQuery,
    repository: new CertificationRepository(dataSource as unknown as DataSource),
  };
};

test("findById looks the certification up by id", async () => {
  const { certificationQuery, repository } = buildRepository();
  certificationQuery.findOne.mockResolvedValue(certification);

  await expect(repository.findById(CERTIFICATION_ID)).resolves.toBe(certification);
  expect(certificationQuery.findOne).toHaveBeenCalledWith({ where: { id: CERTIFICATION_ID } });
});

test("findByUserAndTitle compares titles case-insensitively", async () => {
  const { certificationQuery, repository } = buildRepository();
  certificationQuery.findOne.mockResolvedValue(null);

  await repository.findByUserAndTitle(USER_ID, "React");

  const where = certificationQuery.findOne.mock.calls[0][0]
    .where as FindOptionsWhere<Certification>;
  const title = where.title as FindOperator<string>;
  const getSql = (title as unknown as { _getSql: (alias: string) => string })._getSql;
  expect(where.userId).toBe(USER_ID);
  expect(getSql("certification.title")).toBe("LOWER(certification.title) = LOWER(:title)");
  expect(
    (title as unknown as { objectLiteralParameters: unknown }).objectLiteralParameters,
  ).toEqual({
    title: "React",
  });
  expect(where.id).toBeUndefined();
});

test("findByUserAndTitle excludes the certification being updated", async () => {
  const { certificationQuery, repository } = buildRepository();
  certificationQuery.findOne.mockResolvedValue(null);

  await repository.findByUserAndTitle(USER_ID, "React", CERTIFICATION_ID);

  const where = certificationQuery.findOne.mock.calls[0][0]
    .where as FindOptionsWhere<Certification>;
  expect(where.id).toMatchObject({ type: "not", value: CERTIFICATION_ID });
});

test("create persists a new certification", async () => {
  const { certificationQuery, repository } = buildRepository();
  certificationQuery.save.mockResolvedValue(certification);

  await expect(
    repository.create({
      id: CERTIFICATION_ID,
      userId: USER_ID,
      title: "React",
      description: "Advanced",
      documentUrl: certification.documentUrl,
    }),
  ).resolves.toBe(certification);

  expect(certificationQuery.create).toHaveBeenCalledWith({
    id: CERTIFICATION_ID,
    userId: USER_ID,
    title: "React",
    description: "Advanced",
    documentUrl: certification.documentUrl,
  });
  expect(certificationQuery.save).toHaveBeenCalledWith(certification);
});

test("saveFields updates only the given columns", async () => {
  const { certificationQuery, repository } = buildRepository();

  await repository.saveFields(CERTIFICATION_ID, { title: "React Advanced" });

  expect(certificationQuery.update).toHaveBeenCalledWith(
    { id: CERTIFICATION_ID },
    { title: "React Advanced" },
  );
});

test("hardDelete removes the row by id", async () => {
  const { certificationQuery, repository } = buildRepository();

  await repository.hardDelete(CERTIFICATION_ID);

  expect(certificationQuery.delete).toHaveBeenCalledWith({ id: CERTIFICATION_ID });
});

test("findPage paginates in title and id order", async () => {
  const { certificationQuery, repository } = buildRepository();
  certificationQuery.findAndCount.mockResolvedValue([[certification], 1]);

  await expect(repository.findPage(USER_ID, { page: 3, limit: 10 })).resolves.toEqual({
    items: [certification],
    total: 1,
  });

  expect(certificationQuery.findAndCount).toHaveBeenCalledWith({
    where: { userId: USER_ID },
    order: { title: "ASC", id: "ASC" },
    skip: 20,
    take: 10,
  });
});

test("findOneForUser scopes the lookup to the owner", async () => {
  const { certificationQuery, repository } = buildRepository();
  certificationQuery.findOne.mockResolvedValue(certification);

  await expect(repository.findOneForUser(USER_ID, CERTIFICATION_ID)).resolves.toBe(certification);
  expect(certificationQuery.findOne).toHaveBeenCalledWith({
    where: { id: CERTIFICATION_ID, userId: USER_ID },
  });
});

test("findUser reads from the user repository", async () => {
  const { userQuery, repository } = buildRepository();
  const user = { id: USER_ID, deletedAt: null } as User;
  userQuery.findOne.mockResolvedValue(user);

  await expect(repository.findUser(USER_ID)).resolves.toBe(user);
  expect(userQuery.findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
});
