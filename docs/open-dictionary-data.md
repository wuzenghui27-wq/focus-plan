# Open dictionary data

FanP uses the following open dictionary projects:

- CC-CEDICT: Chinese-English translations and Pinyin. Licensed under
  CC BY-SA 4.0. Source: https://cc-cedict.org/
- Free Dictionary API: English definitions, parts of speech, phonetics and
  examples. Project: https://dictionaryapi.dev/
- Tatoeba: fallback English example sentences. Sentence licenses are returned
  by the API; current search results use CC BY 2.0 FR.
  Project: https://tatoeba.org/

CC-CEDICT data is downloaded into `.data/` and is not committed to Git. Run
`npm.cmd run dictionary:download` after cloning the project.

Oxford Dictionaries data and credentials are not required by FanP.
