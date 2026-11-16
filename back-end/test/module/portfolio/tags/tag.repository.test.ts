import type { DataSource } from "typeorm";
import TagRepository from "../../../../src/module/portfolio/tags/repository/tag.repository";
import Tag from "../../../../src/shared/database/tag/tag.entity";
import User from "../../../../src/shared/database/user/user.entity";

const TAG_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";

const createRepositories = () => {
  const tag = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((input: unknown) => input),
    save: jest.fn(async (input: unknown) => input),
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(async () => ({ affected: 1 })),
  };
  const user = { findOne: jest.fn() };

  const repositories: Record<string, unknown> = {
    [Tag.name]: tag,
    [User.name]: user,
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = { getRepository } as unknown as DataSource;

  return { repository: new TagRepository(dataSource), tag, user, getRepository };
};

test("findById looks a tag up by id", async () => {
  const { repository, tag, getRepository } = createRepositories();
  tag.findOne.mockResolvedValue({ id: TAG_ID });

  await expect(repository.findById(TAG_ID)).resolves.toEqual({ id: TAG_ID });
  expect(getRepository).toHaveBeenCalledWith(Tag);
  expect(tag.findOne).toHaveBeenCalledWith({ where: { id: TAG_ID } });
});

test("findByUserAndName compares names case-insensitively", async () => {
  const { repository, tag } = createRepositories();
  tag.findOne.mockResolvedValue(null);

  await repository.findByUserAndName(USER_ID, "React");

  const options = tag.findOne.mock.calls[0][0];
  expect(options.where.userId).toBe(USER_ID);
  expect(options.where.name).toBeDefined();
  expect(options.where.id).toBeUndefined();
});

test("findByUserAndName excludes the tag being updated", async () => {
  const { repository, tag } = createRepositories();
  tag.findOne.mockResolvedValue(null);

  await repository.findByUserAndName(USER_ID, "React", TAG_ID);

  expect(tag.findOne.mock.calls[0][0].where.id).toBeDefined();
});

test("create saves a new tag", async () => {
  const { repository, tag } = createRepositories();
  const input = { id: TAG_ID, name: "React", filterable: true, imageUrl: null, userId: USER_ID };

  await expect(repository.create(input)).resolves.toEqual(input);
  expect(tag.create).toHaveBeenCalledWith(input);
  expect(tag.save).toHaveBeenCalledWith(input);
});

test("saveFields updates the given columns", async () => {
  const { repository, tag } = createRepositories();
  const changes = { name: "Vue", filterable: false, imageUrl: null };

  await repository.saveFields(TAG_ID, changes);

  expect(tag.update).toHaveBeenCalledWith({ id: TAG_ID }, changes);
});

test("hardDelete removes the row", async () => {
  const { repository, tag } = createRepositories();

  await repository.hardDelete(TAG_ID);

  expect(tag.delete).toHaveBeenCalledWith({ id: TAG_ID });
});

test("findPage filters, orders and paginates", async () => {
  const { repository, tag } = createRepositories();
  tag.findAndCount.mockResolvedValue([[{ id: TAG_ID }], 1]);

  await expect(
    repository.findPage(USER_ID, { filterable: false, limit: 5, page: 3 }),
  ).resolves.toEqual({
    items: [{ id: TAG_ID }],
    total: 1,
  });
  expect(tag.findAndCount).toHaveBeenCalledWith({
    where: { userId: USER_ID, filterable: false },
    order: { name: "ASC", id: "ASC" },
    skip: 10,
    take: 5,
  });
});

test("findPage omits the filterable filter when null", async () => {
  const { repository, tag } = createRepositories();
  tag.findAndCount.mockResolvedValue([[], 0]);

  await repository.findPage(USER_ID, { filterable: null, limit: 20, page: 1 });

  expect(tag.findAndCount.mock.calls[0][0].where).toEqual({ userId: USER_ID });
});

test("findOneForUser scopes by user and id", async () => {
  const { repository, tag } = createRepositories();
  tag.findOne.mockResolvedValue({ id: TAG_ID });

  await expect(repository.findOneForUser(USER_ID, TAG_ID)).resolves.toEqual({ id: TAG_ID });
  expect(tag.findOne).toHaveBeenCalledWith({ where: { id: TAG_ID, userId: USER_ID } });
});

test("findUser loads the user", async () => {
  const { repository, user, getRepository } = createRepositories();
  user.findOne.mockResolvedValue({ id: USER_ID });

  await expect(repository.findUser(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(getRepository).toHaveBeenCalledWith(User);
  expect(user.findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
});
