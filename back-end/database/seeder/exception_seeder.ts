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
  {
    code: "INVALID_USERNAME",
    english:
      "Invalid username. It must be at most 39 characters of letters, numbers and single hyphens.",
    spanish:
      "Nombre de usuario no válido. Debe tener como máximo 39 caracteres de letras, números y guiones simples.",
  },
  {
    code: "INVALID_EMAIL",
    english: "Invalid email. It must be a valid address of at most 320 characters.",
    spanish:
      "Correo electrónico no válido. Debe ser una dirección válida de como máximo 320 caracteres.",
  },
  {
    code: "UNAUTHORIZED",
    english: "Unauthorized",
    spanish: "No autorizado",
  },
  {
    code: "MSG-5",
    english:
      "You do not have permission to create portfolio experiences (missing feature PORTFOLIO_CREATE).",
    spanish:
      "No tienes permiso para crear experiencias de portafolio (falta la funcionalidad PORTFOLIO_CREATE).",
  },
  {
    code: "MSG-6",
    english: "The specified language does not exist.",
    spanish: "El idioma especificado no existe.",
  },
  {
    code: "MSG-7",
    english:
      "The same language is repeated in the experiences list. Each language may appear only once.",
    spanish:
      "El mismo idioma está repetido en la lista de experiencias. Cada idioma puede aparecer solo una vez.",
  },
  {
    code: "MSG-8",
    english: "At least one experience entry is required.",
    spanish: "Se requiere al menos una entrada de experiencia.",
  },
  {
    code: "MSG-9",
    english: "The end date cannot be earlier than the start date.",
    spanish: "La fecha de fin no puede ser anterior a la fecha de inicio.",
  },
  {
    code: "INVALID_URL",
    english: "Invalid URL. It must be a valid absolute URL.",
    spanish: "URL no válida. Debe ser una URL absoluta válida.",
  },
  {
    code: "INVALID_DATE_FORMAT",
    english: "Invalid date. It must follow the format YYYY-MM-DD and be a real calendar date.",
    spanish:
      "Fecha no válida. Debe seguir el formato AAAA-MM-DD y ser una fecha real del calendario.",
  },
  {
    code: "MISSING_FIELD",
    english: "A required field is missing or empty.",
    spanish: "Falta un campo obligatorio o está vacío.",
  },
  {
    code: "INVALID_TITLE",
    english: "Invalid title.",
    spanish: "Título no válido.",
  },
  {
    code: "INVALID_DESCRIPTION",
    english: "Invalid description.",
    spanish: "Descripción no válida.",
  },
  {
    code: "MSG-10",
    english: "Experience not found.",
    spanish: "Experiencia no encontrada.",
  },
  {
    code: "MSG-11",
    english: "The experience was modified by another request. Reload and try again.",
    spanish: "La experiencia fue modificada por otra solicitud. Recarga e inténtalo de nuevo.",
  },
  {
    code: "INVALID_ID",
    english: "Invalid identifier. It must be a well-formed experience id.",
    spanish: "Identificador no válido. Debe ser un id de experiencia con formato correcto.",
  },
  {
    code: "INVALID_QUERY_PARAM",
    english: "Invalid query parameter.",
    spanish: "Parámetro de consulta no válido.",
  },
];

const seedExceptions = async (dataSource: DataSource) => {
  const exceptionIdRepository = dataSource.getRepository(ExceptionId);
  const exceptionRepository = dataSource.getRepository(Exception);
  const languageRepository = dataSource.getRepository(Language);

  const languages = await languageRepository.find();
  const english = languages.find((language) => language.name === "EN");
  const spanish = languages.find((language) => language.name === "ES");
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
