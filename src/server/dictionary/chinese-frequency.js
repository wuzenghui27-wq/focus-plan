import ChineseLexicon from "chinese-lexicon";

function getChineseFrequencyRank(word) {
  const entries = ChineseLexicon.getEntries(word) || [];
  const ranks = entries.flatMap(function (entry) {
    const statistics = entry.statistics || {};
    return [statistics.movieWordRank, statistics.bookWordRank]
      .filter(function (rank) {
        return Number.isFinite(rank) && rank > 0;
      });
  });
  if (ranks.length > 0) {
    return Math.min(...ranks);
  }

  const hskLevels = entries.map(function (entry) {
    return entry.statistics?.hskLevel;
  }).filter(function (level) {
    return Number.isFinite(level) && level > 0;
  });
  return hskLevels.length > 0
    ? Math.min(...hskLevels) * 2500
    : Number.POSITIVE_INFINITY;
}

export { getChineseFrequencyRank };
