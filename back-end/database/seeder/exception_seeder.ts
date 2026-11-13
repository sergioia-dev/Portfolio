import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import Exception from "../../src/shared/database/exception/exception.entity";
import ExceptionId from "../../src/shared/database/exception/exception_id.entity";
import Language from "../../src/shared/database/language/language.entity";

const EXCEPTIONS = [
  {
    code: "MSG-1",
    english: "Username is already taken.",
    spanish: "El nombre de usuario ya está en uso.",
  },
  {
    code: "MSG-2",
    english: "Email address is already registered.",
    spanish: "El correo electrónico ya está registrado.",
  },
  {
    code: "MSG-3",
    english:
      "Invalid password. It must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@ ! & - _).",
    spanish:
      "La contraseña no es válida. Debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@ ! & - _).",
  },
  {
    code: "MSG-4",
    english: "User not found",
    spanish: "Usuario no encontrado",
  },
];

const seedExceptions = async (dataSource: DataSource) => {
  const exceptionIdRepository = dataSource.getRepository(ExceptionId);
  const exceptionRepository = dataSource.getRepository(Exception);
  const languageRepository = dataSource.getRepository(Language);

  const languages = await languageRepository.find();
  const english = languages.find((language) => language.name === "ENGLISH");
  const spanish = languages.find((language) => language.name === "SPANISH");
  if (!english || !spanish) {
    throw new Error("The languages seeder must run before the exceptions seeder");
  }

  const storedIds = await exceptionIdRepository.find({
    select: { id: true, code: true },
  });
  const codeToId = new Map(storedIds.map((stored) => [stored.code, stored.id]));

  const missingIds = EXCEPTIONS.filter((item) => !codeToId.has(item.code)).map((item) => {
    const id = randomUUID();
    codeToId.set(item.code, id);
    return { id, code: item.code };
  });
  if (missingIds.length > 0) await exceptionIdRepository.save(missingIds);

  const storedMessages = await exceptionRepository.find({
    select: { id: true, languageId: true },
  });
  const messageKey = (id: string, languageId: string) => `${id}:${languageId}`;
  const storedKeys = new Set(
    storedMessages.map((stored) => messageKey(stored.id, stored.languageId)),
  );

  const missingMessages = EXCEPTIONS.flatMap((item) => {
    const id = codeToId.get(item.code) as string;
    return [
      { languageId: english.id, message: item.english },
      { languageId: spanish.id, message: item.spanish },
    ]
      .filter((translation) => !storedKeys.has(messageKey(id, translation.languageId)))
      .map((translation) => exceptionRepository.create({ id, ...translation }));
  });
  if (missingMessages.length > 0) {
    await exceptionRepository.save(missingMessages);
  }
};

export default seedExceptions;
