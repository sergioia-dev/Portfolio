import type TagRepository from "../../../../src/module/portfolio/tags/repository/tag.repository";
import TagService from "../../../../src/module/portfolio/tags/service/tag.service";

const TAG_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const OTHER_ID = "9b1e3a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const UPDATED_AT = new Date("2024-02-01T00:00:00Z");

const tag = (overrides: Record<string, unknown> = {}) => ({
  id: TAG_ID,
  userId: USER_ID,
  name: "React",
  filterable: true,
  imageUrl: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: UPDATED_AT,
  ...overrides,
});

const createRepository = () => ({
  findById: jest.fn().mockResolvedValue(tag()),
  findByUserAndName: jest.fn().mockResolvedValue(null),
  create: jest.fn(async (input: unknown) => input),
  saveFields: jest.fn().mockResolvedValue(undefined),
  hardDelete: jest.fn().mockResolvedValue(undefined),
  findPage: jest.fn().mockResolvedValue({ items: [tag()], total: 1 }),
  findOneForUser: jest.fn().mockResolvedValue(tag()),
  findUser: jest.fn().mockResolvedValue({ id: USER_ID, deletedAt: null }),
});

const createStorage = () => ({
  createObject: jest.fn().mockResolvedValue("https://storage.googleapis.com/bucket/tags/new"),
  deleteObject: jest.fn().mockResolvedValue(undefined),
});

const buildService = () => {
  const repository = createRepository();
  const storage = createStorage();
  return {
    service: new TagService(repository as unknown as TagRepository, storage),
    repository,
    storage,
  };
};

const svg = Buffer.from("<svg></svg>");

test("create stores a trimmed tag without an image", async () => {
  const { service, repository, storage } = buildService();

  await expect(service.create(USER_ID, { name: "  React  " })).resolves.toMatchObject({
    name: "React",
    filterable: true,
    imageUrl: null,
  });
  expect(repository.create).toHaveBeenCalledWith({
    id: expect.any(String),
    name: "React",
    filterable: true,
    imageUrl: null,
    userId: USER_ID,
  });
  expect(storage.createObject).not.toHaveBeenCalled();
});

test("create uploads an SVG and stores its public url", async () => {
  const { service, repository, storage } = buildService();

  await service.create(USER_ID, { name: "React", filterable: "false" }, { buffer: svg });

  expect(storage.createObject).toHaveBeenCalledWith(
    expect.stringMatching(new RegExp(`^tags/${USER_ID}/`)),
    svg,
    "image/svg+xml",
    "attachment",
  );
  expect(repository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      filterable: false,
      imageUrl: "https://storage.googleapis.com/bucket/tags/new",
    }),
  );
});

test("create rejects a duplicate name", async () => {
  const { service, repository, storage } = buildService();
  repository.findByUserAndName.mockResolvedValue(tag());

  await expect(service.create(USER_ID, { name: "react" })).rejects.toMatchObject({
    code: "MSG-13",
  });
  expect(repository.create).not.toHaveBeenCalled();
  expect(storage.createObject).not.toHaveBeenCalled();
});

test("create maps a unique violation and removes the uploaded image", async () => {
  const { service, repository, storage } = buildService();
  repository.create.mockRejectedValue({ driverError: { code: "23505" } });

  await expect(service.create(USER_ID, { name: "React" }, { buffer: svg })).rejects.toMatchObject({
    code: "MSG-13",
  });
  expect(storage.deleteObject).toHaveBeenCalledWith("tags/new");
});

test("create rethrows unrelated repository errors", async () => {
  const { service, repository } = buildService();
  repository.create.mockRejectedValue(new Error("boom"));

  await expect(service.create(USER_ID, { name: "React" })).rejects.toThrow("boom");
});

test("create validates fields before writing", async () => {
  const { service, repository } = buildService();

  await expect(service.create(USER_ID, { name: "" })).rejects.toMatchObject({
    code: "INVALID_NAME",
  });
  await expect(
    service.create(USER_ID, { name: "React" }, { buffer: Buffer.from("<html></html>") }),
  ).rejects.toMatchObject({ code: "INVALID_FORMAT" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("update renames a tag and returns the merged entity", async () => {
  const { service, repository } = buildService();

  await expect(
    service.update(USER_ID, TAG_ID, null, { name: "Vue", filterable: "false" }),
  ).resolves.toMatchObject({ id: TAG_ID, name: "Vue", filterable: false, imageUrl: null });
  expect(repository.saveFields).toHaveBeenCalledWith(TAG_ID, {
    name: "Vue",
    filterable: false,
    imageUrl: null,
  });
});

test("update enforces the If-Match precondition", async () => {
  const { service, repository } = buildService();

  await expect(
    service.update(USER_ID, TAG_ID, "2024-01-01T00:00:00.000Z", {
      name: "Vue",
      filterable: "true",
    }),
  ).rejects.toMatchObject({ code: "MSG-11" });
  expect(repository.saveFields).not.toHaveBeenCalled();
});

test("update accepts a matching If-Match", async () => {
  const { service, repository } = buildService();

  await service.update(USER_ID, TAG_ID, UPDATED_AT.toISOString(), {
    name: "Vue",
    filterable: "true",
  });

  expect(repository.saveFields).toHaveBeenCalled();
});

test("update rejects unknown, foreign or malformed tags", async () => {
  const { service, repository } = buildService();
  repository.findById.mockResolvedValue(null);
  await expect(
    service.update(USER_ID, TAG_ID, null, { name: "Vue", filterable: "true" }),
  ).rejects.toMatchObject({ code: "MSG-14" });

  repository.findById.mockResolvedValue(tag({ userId: OTHER_ID }));
  await expect(
    service.update(USER_ID, TAG_ID, null, { name: "Vue", filterable: "true" }),
  ).rejects.toMatchObject({ code: "MSG-14" });

  await expect(
    service.update(USER_ID, "nope", null, { name: "Vue", filterable: "true" }),
  ).rejects.toMatchObject({ code: "INVALID_ID" });
});

test("update replaces the image and removes the old object", async () => {
  const { service, repository, storage } = buildService();
  repository.findById.mockResolvedValue(
    tag({ imageUrl: "https://storage.googleapis.com/bucket/tags/old" }),
  );

  await service.update(
    USER_ID,
    TAG_ID,
    null,
    { name: "React", filterable: "true" },
    { buffer: svg },
  );

  expect(storage.deleteObject).toHaveBeenCalledWith("tags/old");
  expect(repository.saveFields).toHaveBeenCalledWith(TAG_ID, {
    name: "React",
    filterable: true,
    imageUrl: "https://storage.googleapis.com/bucket/tags/new",
  });
});

test("update removes the image when remove_image is true", async () => {
  const { service, repository, storage } = buildService();
  repository.findById.mockResolvedValue(
    tag({ imageUrl: "https://storage.googleapis.com/bucket/tags/old" }),
  );

  await service.update(USER_ID, TAG_ID, null, {
    name: "React",
    filterable: "true",
    remove_image: "true",
  });

  expect(storage.deleteObject).toHaveBeenCalledWith("tags/old");
  expect(repository.saveFields).toHaveBeenCalledWith(TAG_ID, {
    name: "React",
    filterable: true,
    imageUrl: null,
  });
});

test("update rejects image and remove_image together", async () => {
  const { service } = buildService();

  await expect(
    service.update(
      USER_ID,
      TAG_ID,
      null,
      {
        name: "React",
        filterable: "true",
        remove_image: "true",
      },
      { buffer: svg },
    ),
  ).rejects.toMatchObject({ code: "INVALID_FIELD" });
});

test("update requires filterable and rejects a duplicate name", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, TAG_ID, null, { name: "React" })).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });

  repository.findByUserAndName.mockResolvedValue(tag({ id: OTHER_ID }));
  await expect(
    service.update(USER_ID, TAG_ID, null, { name: "Vue", filterable: "true" }),
  ).rejects.toMatchObject({ code: "MSG-13" });
});

test("remove hard deletes the tag and its image", async () => {
  const { service, repository, storage } = buildService();
  repository.findById.mockResolvedValue(
    tag({ imageUrl: "https://storage.googleapis.com/bucket/tags/old" }),
  );

  await service.remove(USER_ID, TAG_ID);

  expect(repository.hardDelete).toHaveBeenCalledWith(TAG_ID);
  expect(storage.deleteObject).toHaveBeenCalledWith("tags/old");
});

test("remove does not delete the image when the tag has none", async () => {
  const { service, storage } = buildService();

  await service.remove(USER_ID, TAG_ID);

  expect(storage.deleteObject).not.toHaveBeenCalled();
});

test("list returns the page and metadata", async () => {
  const { service, repository } = buildService();

  await expect(
    service.list(USER_ID, { filterable: "true", limit: "5", page: "2" }),
  ).resolves.toEqual({
    items: [tag()],
    total: 1,
    filterable: true,
    limit: 5,
    page: 2,
  });
  expect(repository.findPage).toHaveBeenCalledWith(USER_ID, {
    filterable: true,
    limit: 5,
    page: 2,
  });
});

test("list validates the user before querying tags", async () => {
  const { service, repository } = buildService();

  await expect(service.list("nope", {})).rejects.toMatchObject({ code: "INVALID_ID" });

  repository.findUser.mockResolvedValue(null);
  await expect(service.list(USER_ID, {})).rejects.toMatchObject({ code: "MSG-4" });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: new Date() });
  await expect(service.list(USER_ID, {})).rejects.toMatchObject({ code: "MSG-4" });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null });
  await expect(service.list(USER_ID, { limit: "0" })).rejects.toMatchObject({
    code: "INVALID_QUERY_PARAM",
  });
});

test("get returns a tag of the user", async () => {
  const { service, repository } = buildService();

  await expect(service.get(USER_ID, TAG_ID)).resolves.toMatchObject({ id: TAG_ID });
  expect(repository.findOneForUser).toHaveBeenCalledWith(USER_ID, TAG_ID);
});

test("get rejects a missing user or tag", async () => {
  const { service, repository } = buildService();
  repository.findUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, TAG_ID)).rejects.toMatchObject({ code: "MSG-4" });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null });
  repository.findOneForUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, TAG_ID)).rejects.toMatchObject({ code: "MSG-14" });

  await expect(service.get("nope", TAG_ID)).rejects.toMatchObject({ code: "INVALID_ID" });
});
