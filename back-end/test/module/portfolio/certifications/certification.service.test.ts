import type CertificationRepository from "../../../../src/module/portfolio/certifications/repository/certification.repository";
import CertificationService from "../../../../src/module/portfolio/certifications/service/certification.service";
import type Certification from "../../../../src/shared/database/certification/certification.entity";
import type User from "../../../../src/shared/database/user/user.entity";

const CERTIFICATION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const OLD_URL = "https://storage.googleapis.com/bucket/old.pdf";
const NEW_URL = "https://storage.googleapis.com/bucket/new.pdf";
const pdf = Buffer.from("%PDF-1.7\nbody");

const buildCertification = (overrides: Partial<Certification> = {}): Certification =>
  ({
    id: CERTIFICATION_ID,
    userId: USER_ID,
    title: "React",
    description: "Advanced",
    documentUrl: OLD_URL,
    ...overrides,
  }) as Certification;

const buildRepository = () => ({
  findById: jest.fn(),
  findByUserAndTitle: jest.fn(),
  create: jest.fn(),
  saveFields: jest.fn(),
  hardDelete: jest.fn(),
  findPage: jest.fn(),
  findOneForUser: jest.fn(),
  findUser: jest.fn(),
});

const buildStorage = () => ({
  createObject: jest.fn(async () => NEW_URL),
  deleteObject: jest.fn(async () => undefined),
});

const buildService = () => {
  const repository = buildRepository();
  const storage = buildStorage();
  return {
    repository,
    storage,
    service: new CertificationService(repository as unknown as CertificationRepository, storage),
  };
};

test("create stores the document and returns the certification", async () => {
  const { repository, storage, service } = buildService();
  repository.findByUserAndTitle.mockResolvedValue(null);
  repository.create.mockImplementation(async (input: unknown) => input);

  const result = await service.create(USER_ID, { title: " React ", description: "Advanced" }, pdf);

  expect(storage.createObject).toHaveBeenCalledWith(
    expect.stringMatching(new RegExp(`^${USER_ID}/certifications/[0-9a-f-]+\\.pdf$`)),
    pdf,
    "application/pdf",
    "attachment",
  );
  expect(repository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: USER_ID,
      title: "React",
      description: "Advanced",
      documentUrl: NEW_URL,
    }),
  );
  expect(result).toMatchObject({ title: "React", documentUrl: NEW_URL });
});

test("create rejects an existing title before uploading", async () => {
  const { repository, storage, service } = buildService();
  repository.findByUserAndTitle.mockResolvedValue(buildCertification());

  await expect(
    service.create(USER_ID, { title: "React", description: "Advanced" }, pdf),
  ).rejects.toMatchObject({ code: "MSG-13", httpStatus: 409 });
  expect(storage.createObject).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
});

test("create maps a unique violation to MSG-13 and removes the upload", async () => {
  const { repository, storage, service } = buildService();
  repository.findByUserAndTitle.mockResolvedValue(null);
  repository.create.mockRejectedValue({ code: "23505" });

  await expect(
    service.create(USER_ID, { title: "React", description: "Advanced" }, pdf),
  ).rejects.toMatchObject({ code: "MSG-13" });
  expect(storage.deleteObject).toHaveBeenCalledWith("new.pdf");
});

test("create maps a driver unique violation and rethrows other failures", async () => {
  const { repository, storage, service } = buildService();
  repository.findByUserAndTitle.mockResolvedValue(null);
  repository.create.mockRejectedValueOnce({ driverError: { code: "23505" } });

  await expect(
    service.create(USER_ID, { title: "React", description: "Advanced" }, pdf),
  ).rejects.toMatchObject({ code: "MSG-13" });

  repository.create.mockRejectedValueOnce(new Error("boom"));
  await expect(
    service.create(USER_ID, { title: "React", description: "Advanced" }, pdf),
  ).rejects.toThrow("boom");
  expect(storage.deleteObject).toHaveBeenCalledTimes(2);
});

test("create rejects invalid parts before touching storage", async () => {
  const { repository, storage, service } = buildService();

  await expect(service.create(USER_ID, { title: "React" }, pdf)).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
  expect(repository.findByUserAndTitle).not.toHaveBeenCalled();
  expect(storage.createObject).not.toHaveBeenCalled();
});

test("update changes text and keeps the existing document", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());
  repository.findByUserAndTitle.mockResolvedValue(null);

  const result = await service.update(USER_ID, CERTIFICATION_ID, {
    title: "React Advanced",
    description: "Expert",
  });

  expect(repository.saveFields).toHaveBeenCalledWith(CERTIFICATION_ID, {
    title: "React Advanced",
    description: "Expert",
    documentUrl: OLD_URL,
  });
  expect(storage.createObject).not.toHaveBeenCalled();
  expect(storage.deleteObject).not.toHaveBeenCalled();
  expect(result).toMatchObject({
    title: "React Advanced",
    description: "Expert",
    documentUrl: OLD_URL,
  });
});

test("update replaces the document and removes the old one", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());
  repository.findByUserAndTitle.mockResolvedValue(null);

  const result = await service.update(USER_ID, CERTIFICATION_ID, {}, pdf);

  expect(storage.createObject).toHaveBeenCalled();
  expect(repository.saveFields).toHaveBeenCalledWith(CERTIFICATION_ID, {
    title: "React",
    description: "Advanced",
    documentUrl: NEW_URL,
  });
  expect(storage.deleteObject).toHaveBeenCalledWith("old.pdf");
  expect(result.documentUrl).toBe(NEW_URL);
});

test("update rejects a title owned by another certification", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());
  repository.findByUserAndTitle.mockResolvedValue(buildCertification({ id: "other" }));

  await expect(service.update(USER_ID, CERTIFICATION_ID, { title: "Taken" })).rejects.toMatchObject(
    { code: "MSG-13" },
  );
  expect(storage.createObject).not.toHaveBeenCalled();
  expect(repository.saveFields).not.toHaveBeenCalled();
});

test("update cleans up a newly uploaded document when saving fails", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());
  repository.findByUserAndTitle.mockResolvedValue(null);
  repository.saveFields.mockRejectedValue({ code: "23505" });

  await expect(service.update(USER_ID, CERTIFICATION_ID, {}, pdf)).rejects.toMatchObject({
    code: "MSG-13",
  });
  expect(storage.deleteObject).toHaveBeenCalledWith("new.pdf");
  expect(storage.deleteObject).toHaveBeenCalledTimes(1);
});

test("update rethrows other failures after removing the upload", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());
  repository.findByUserAndTitle.mockResolvedValue(null);
  repository.saveFields.mockRejectedValue(new Error("boom"));

  await expect(service.update(USER_ID, CERTIFICATION_ID, {}, pdf)).rejects.toThrow("boom");
  expect(storage.deleteObject).toHaveBeenCalledWith("new.pdf");
});

test("update rejects a malformed id, a missing certification and a foreign certification", async () => {
  const { repository, service } = buildService();

  await expect(service.update(USER_ID, "nope", { title: "React" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });

  repository.findById.mockResolvedValue(null);
  await expect(service.update(USER_ID, CERTIFICATION_ID, { title: "React" })).rejects.toMatchObject(
    { code: "MSG-10" },
  );

  repository.findById.mockResolvedValue(buildCertification({ userId: "other-user" }));
  await expect(service.update(USER_ID, CERTIFICATION_ID, { title: "React" })).rejects.toMatchObject(
    { code: "MSG-10" },
  );
});

test("update requires at least one part", async () => {
  const { repository, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());

  await expect(service.update(USER_ID, CERTIFICATION_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
});

test("remove hard-deletes the row and then the document", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());

  await service.remove(USER_ID, CERTIFICATION_ID);

  expect(repository.hardDelete).toHaveBeenCalledWith(CERTIFICATION_ID);
  expect(storage.deleteObject).toHaveBeenCalledWith("old.pdf");
});

test("remove logs an orphaned document instead of failing", async () => {
  const { repository, storage, service } = buildService();
  repository.findById.mockResolvedValue(buildCertification());
  storage.deleteObject.mockRejectedValue(new Error("storage down"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  await expect(service.remove(USER_ID, CERTIFICATION_ID)).resolves.toBeUndefined();

  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});

test("remove rejects a missing or foreign certification", async () => {
  const { repository, service } = buildService();
  repository.findById.mockResolvedValue(null);

  await expect(service.remove(USER_ID, CERTIFICATION_ID)).rejects.toMatchObject({
    code: "MSG-10",
  });

  repository.findById.mockResolvedValue(buildCertification({ userId: "other-user" }));
  await expect(service.remove(USER_ID, CERTIFICATION_ID)).rejects.toMatchObject({
    code: "MSG-10",
  });
  expect(repository.hardDelete).not.toHaveBeenCalled();
});

test("list returns a page of certifications for an existing user", async () => {
  const { repository, service } = buildService();
  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null } as User);
  repository.findPage.mockResolvedValue({ items: [buildCertification()], total: 1 });

  await expect(service.list(USER_ID, { page: "2", limit: "10" })).resolves.toEqual({
    items: [buildCertification()],
    total: 1,
    page: 2,
    limit: 10,
  });
  expect(repository.findPage).toHaveBeenCalledWith(USER_ID, { page: 2, limit: 10 });
});

test("list rejects a malformed user id", async () => {
  const { repository, service } = buildService();

  await expect(service.list("nope", {})).rejects.toMatchObject({ code: "INVALID_USER_ID" });
  expect(repository.findUser).not.toHaveBeenCalled();
});

test("list rejects a missing or deleted user", async () => {
  const { repository, service } = buildService();

  repository.findUser.mockResolvedValue(null);
  await expect(service.list(USER_ID, {})).rejects.toMatchObject({ code: "MSG-4" });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: new Date() } as User);
  await expect(service.list(USER_ID, {})).rejects.toMatchObject({ code: "MSG-4" });
});

test("list rejects invalid pagination", async () => {
  const { repository, service } = buildService();
  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null } as User);

  await expect(service.list(USER_ID, { limit: "1000" })).rejects.toMatchObject({
    code: "INVALID_QUERY_PARAM",
  });
  expect(repository.findPage).not.toHaveBeenCalled();
});

test("get returns a certification of the user", async () => {
  const { repository, service } = buildService();
  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null } as User);
  repository.findOneForUser.mockResolvedValue(buildCertification());

  await expect(service.get(USER_ID, CERTIFICATION_ID)).resolves.toEqual(buildCertification());
  expect(repository.findOneForUser).toHaveBeenCalledWith(USER_ID, CERTIFICATION_ID);
});

test("get rejects a malformed user or certification id", async () => {
  const { repository, service } = buildService();
  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null } as User);

  await expect(service.get("nope", CERTIFICATION_ID)).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });
  await expect(service.get(USER_ID, "nope")).rejects.toMatchObject({
    code: "INVALID_CERTIFICATION_ID",
  });
});

test("get rejects a missing user or certification", async () => {
  const { repository, service } = buildService();

  repository.findUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, CERTIFICATION_ID)).rejects.toMatchObject({ code: "MSG-4" });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null } as User);
  repository.findOneForUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, CERTIFICATION_ID)).rejects.toMatchObject({ code: "MSG-10" });
});
