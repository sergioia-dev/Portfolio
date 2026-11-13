import type { DataSource } from "typeorm";
import Exception from "../../shared/database/exception/exception.entity";
import ExceptionId from "../../shared/database/exception/exception_id.entity";
import Language from "../../shared/database/language/language.entity";

const DEFAULT_LANGUAGE = "EN";

export default class MessageRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getMessage(code: string, language?: string): Promise<string | null> {
    const exceptionId = await this.dataSource
      .getRepository(ExceptionId)
      .findOne({ where: { code } });
    if (!exceptionId) return null;

    const languages = await this.dataSource.getRepository(Language).find();
    const requested = language
      ? languages.find((entry) => entry.name.toLowerCase() === language.toLowerCase())
      : undefined;
    const fallback = languages.find(
      (entry) => entry.name.toLowerCase() === DEFAULT_LANGUAGE.toLowerCase(),
    );

    const languageIds = [requested?.id, fallback?.id].filter(
      (id, index, ids): id is string => id !== undefined && ids.indexOf(id) === index,
    );

    const exceptionRepository = this.dataSource.getRepository(Exception);
    for (const languageId of languageIds) {
      const exception = await exceptionRepository.findOne({
        where: { id: exceptionId.id, languageId },
      });
      if (exception) return exception.message;
    }

    return null;
  }
}
