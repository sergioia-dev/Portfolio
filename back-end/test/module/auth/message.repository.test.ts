import type { DataSource } from "typeorm";
import MessageRepository from "../../../src/module/auth/message.repository";
import Exception from "../../../src/shared/database/exception/exception.entity";
import ExceptionId from "../../../src/shared/database/exception/exception_id.entity";
import Language from "../../../src/shared/database/language/language.entity";

const LANGUAGES = [
  { id: "en-id", name: "EN" },
  { id: "es-id", name: "ES" },
];

const createRepository = () => {
  const exceptionIdRepository = { findOne: jest.fn() };
  const exceptionRepository = { findOne: jest.fn() };
  const languageRepository = { find: jest.fn() };
  const repositories = new Map<unknown, unknown>([
    [ExceptionId, exceptionIdRepository],
    [Exception, exceptionRepository],
    [Language, languageRepository],
  ]);
  const dataSource = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  } as unknown as DataSource;

  return {
    repository: new MessageRepository(dataSource),
    exceptionIdRepository,
    exceptionRepository,
    languageRepository,
  };
};

test("getMessage returns the message for the requested language", async () => {
  const { repository, exceptionIdRepository, exceptionRepository, languageRepository } =
    createRepository();
  exceptionIdRepository.findOne.mockResolvedValue({ id: "code-id" });
  languageRepository.find.mockResolvedValue(LANGUAGES);
  exceptionRepository.findOne.mockImplementation(
    async ({ where }: { where: { languageId: string } }) =>
      where.languageId === "es-id" ? { message: "El nombre de usuario ya está en uso." } : null,
  );

  await expect(repository.getMessage("MSG-1", "es")).resolves.toBe(
    "El nombre de usuario ya está en uso.",
  );
  expect(exceptionIdRepository.findOne).toHaveBeenCalledWith({ where: { code: "MSG-1" } });
  expect(exceptionRepository.findOne).toHaveBeenNthCalledWith(1, {
    where: { id: "code-id", languageId: "es-id" },
  });
});

test("getMessage matches the language case-insensitively", async () => {
  const { repository, exceptionIdRepository, exceptionRepository, languageRepository } =
    createRepository();
  exceptionIdRepository.findOne.mockResolvedValue({ id: "code-id" });
  languageRepository.find.mockResolvedValue(LANGUAGES);
  exceptionRepository.findOne.mockImplementation(
    async ({ where }: { where: { languageId: string } }) =>
      where.languageId === "es-id" ? { message: "Credenciales no válidas" } : null,
  );

  await expect(repository.getMessage("MSG-4", "ES")).resolves.toBe("Credenciales no válidas");
});

test("getMessage falls back to English for an unknown language", async () => {
  const { repository, exceptionIdRepository, exceptionRepository, languageRepository } =
    createRepository();
  exceptionIdRepository.findOne.mockResolvedValue({ id: "code-id" });
  languageRepository.find.mockResolvedValue(LANGUAGES);
  exceptionRepository.findOne.mockImplementation(
    async ({ where }: { where: { languageId: string } }) =>
      where.languageId === "en-id" ? { message: "Username is already taken." } : null,
  );

  await expect(repository.getMessage("MSG-1", "fr")).resolves.toBe("Username is already taken.");
  expect(exceptionRepository.findOne).toHaveBeenCalledTimes(1);
  expect(exceptionRepository.findOne).toHaveBeenCalledWith({
    where: { id: "code-id", languageId: "en-id" },
  });
});

test("getMessage falls back to English when the translation is missing", async () => {
  const { repository, exceptionIdRepository, exceptionRepository, languageRepository } =
    createRepository();
  exceptionIdRepository.findOne.mockResolvedValue({ id: "code-id" });
  languageRepository.find.mockResolvedValue(LANGUAGES);
  exceptionRepository.findOne.mockImplementation(
    async ({ where }: { where: { languageId: string } }) =>
      where.languageId === "en-id" ? { message: "Unauthorized" } : null,
  );

  await expect(repository.getMessage("UNAUTHORIZED", "es")).resolves.toBe("Unauthorized");
  expect(exceptionRepository.findOne).toHaveBeenNthCalledWith(1, {
    where: { id: "code-id", languageId: "es-id" },
  });
  expect(exceptionRepository.findOne).toHaveBeenNthCalledWith(2, {
    where: { id: "code-id", languageId: "en-id" },
  });
});

test("getMessage queries English once when the requested language is English", async () => {
  const { repository, exceptionIdRepository, exceptionRepository, languageRepository } =
    createRepository();
  exceptionIdRepository.findOne.mockResolvedValue({ id: "code-id" });
  languageRepository.find.mockResolvedValue(LANGUAGES);
  exceptionRepository.findOne.mockResolvedValue({ message: "Unauthorized" });

  await expect(repository.getMessage("UNAUTHORIZED", "en")).resolves.toBe("Unauthorized");
  expect(exceptionRepository.findOne).toHaveBeenCalledTimes(1);
});

test("getMessage returns null for an unknown code", async () => {
  const { repository, exceptionIdRepository, languageRepository } = createRepository();
  exceptionIdRepository.findOne.mockResolvedValue(null);

  await expect(repository.getMessage("UNKNOWN", "en")).resolves.toBeNull();
  expect(languageRepository.find).not.toHaveBeenCalled();
});

test("getMessage returns null when no English fallback exists", async () => {
  const { repository, exceptionIdRepository, exceptionRepository, languageRepository } =
    createRepository();
  exceptionIdRepository.findOne.mockResolvedValue({ id: "code-id" });
  languageRepository.find.mockResolvedValue([{ id: "es-id", name: "ES" }]);
  exceptionRepository.findOne.mockImplementation(
    async ({ where }: { where: { languageId: string } }) =>
      where.languageId === "es-id" ? { message: "No autorizado" } : null,
  );

  await expect(repository.getMessage("UNAUTHORIZED", "fr")).resolves.toBeNull();
  expect(exceptionRepository.findOne).not.toHaveBeenCalled();
});
