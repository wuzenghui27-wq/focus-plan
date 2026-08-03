# Open dictionary data

FanP uses the following open dictionary projects:

- ECDICT: offline English-Chinese translations, phonetics, parts of speech
  and inflection metadata. Licensed under MIT and used as the primary Chinese
  translation source for English queries. Project: https://github.com/skywind3000/ECDICT
- CC-CEDICT: Chinese-English translations and Pinyin. Licensed under
  CC BY-SA 4.0. Source: https://cc-cedict.org/
- Free Dictionary API: English definitions, parts of speech, phonetics and
  examples. Project: https://dictionaryapi.dev/
- English Wiktionary: fallback English definitions and examples when the
  primary API is unavailable. Licensed under CC BY-SA.
  Project: https://en.wiktionary.org/
- Tatoeba: fallback English example sentences. Sentence licenses are returned
  by the API; current search results use CC BY 2.0 FR.
  Project: https://tatoeba.org/
- Chinese Lexicon: modern Chinese movie and book frequency statistics used to
  rank CC-CEDICT translation candidates. Licensed under ISC.
  Project: https://github.com/peterolson/chinese-lexicon

FanP also keeps a small reviewed list of high-frequency ambiguous words so the
single Chinese meaning and the displayed English definition stay on the same
sense. Other English words use ECDICT directly, with CC-CEDICT as a fallback.

CC-CEDICT data is downloaded into `.data/` and is not committed to Git. Run
`npm.cmd run dictionary:download` after cloning the project.

Oxford Dictionaries data and credentials are not required by FanP.
