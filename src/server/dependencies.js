import path from "node:path";
import { createAccountStore } from "./data/account-store.js";
import { createCedictStore } from "./dictionary/cedict-store.js";
import { getChineseFrequencyRank } from "./dictionary/chinese-frequency.js";
import { createEcdictProvider } from "./dictionary/ecdict-provider.js";
import { createFreeDictionaryProvider } from "./dictionary/free-dictionary-provider.js";
import { createOpenDictionary } from "./dictionary/open-dictionary.js";
import { createTatoebaProvider } from "./dictionary/tatoeba-provider.js";
import { createWiktionaryProvider } from "./dictionary/wiktionary-provider.js";
import { createPushService } from "./reminders/push-service.js";
import { createReminderScheduler } from "./reminders/reminder-scheduler.js";

function createDependencies(config) {
  const store = createAccountStore(config.databasePath);
  const pushService = createPushService(config.vapid);
  const cacheDirectory = path.join(config.projectRoot, ".data", "dictionary-cache");
  const dictionaryService = createOpenDictionary({
    cedict: createCedictStore({
      filePath: path.join(
        config.projectRoot,
        ".data",
        "cedict_1_0_ts_utf-8_mdbg.txt.gz"
      ),
      getFrequencyRank: getChineseFrequencyRank
    }),
    translationProvider: createEcdictProvider(),
    englishProvider: createWiktionaryProvider({ cacheDirectory }),
    englishProviderName: "Wiktionary",
    fallbackEnglishProvider: createFreeDictionaryProvider({ cacheDirectory }),
    fallbackEnglishProviderName: "Free Dictionary API",
    exampleProvider: createTatoebaProvider({ cacheDirectory })
  });
  const reminderScheduler = createReminderScheduler({ store, pushService });

  return { store, pushService, dictionaryService, reminderScheduler };
}

export { createDependencies };
