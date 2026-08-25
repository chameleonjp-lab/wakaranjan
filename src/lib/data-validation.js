export function validateCoreData({ manifest, tiles, yaku, terms, rules, lessons }) {
  const errors = [];
  const warnings = [];

  const push = (condition, code, message) => {
    if (!condition) errors.push({ code, message });
  };

  const uniqueBy = (items, key, label) => {
    const seen = new Set();
    for (const item of items) {
      const value = item?.[key];
      if (seen.has(value)) errors.push({ code: `duplicate-${label}-${key}`, message: `${label} の ${key} が重複しています: ${value}` });
      seen.add(value);
    }
  };

  push(manifest?.schemaVersion === 1, "manifest-schema", "manifest.schemaVersion は 1 である必要があります。");
  push(Array.isArray(tiles?.tiles), "tiles-array", "tiles.tiles が配列ではありません。");
  push(Array.isArray(yaku?.yaku), "yaku-array", "yaku.yaku が配列ではありません。");
  push(Array.isArray(terms?.terms), "terms-array", "terms.terms が配列ではありません。");
  push(Array.isArray(rules?.rulesets), "rules-array", "rules.rulesets が配列ではありません。");
  push(Array.isArray(lessons?.lessons), "lessons-array", "lessons.lessons が配列ではありません。");

  if (errors.length) return { ok: false, errors, warnings };

  uniqueBy(tiles.tiles, "id", "tile");
  uniqueBy(tiles.tiles, "code", "tile");
  uniqueBy(tiles.tiles, "sortOrder", "tile");
  uniqueBy(yaku.yaku, "id", "yaku");
  uniqueBy(terms.terms, "id", "term");
  uniqueBy(rules.rulesets, "id", "ruleset");
  uniqueBy(lessons.lessons, "id", "lesson");

  push(tiles.tiles.length === 34, "tile-count", `通常牌は34種類必要です。現在: ${tiles.tiles.length}`);
  const expectedCodes = [
    ...Array.from({ length: 9 }, (_, i) => `${i + 1}m`),
    ...Array.from({ length: 9 }, (_, i) => `${i + 1}p`),
    ...Array.from({ length: 9 }, (_, i) => `${i + 1}s`),
    ...Array.from({ length: 7 }, (_, i) => `${i + 1}z`)
  ];
  const codeSet = new Set(tiles.tiles.map((tile) => tile.code));
  for (const code of expectedCodes) push(codeSet.has(code), "tile-code-missing", `牌コード ${code} がありません。`);

  for (const tile of tiles.tiles) {
    push(typeof tile.id === "string" && tile.id.startsWith("tile-"), "tile-id", `牌IDが不正です: ${tile.id}`);
    push(Boolean(tile.nameJa && tile.readingJa && tile.readingKana), "tile-label", `牌の名称または読みが不足しています: ${tile.id}`);
    if (tile.suit === "honor") {
      push(tile.number === null && tile.isHonor === true, "honor-shape", `字牌定義が不正です: ${tile.id}`);
    } else {
      push(Number.isInteger(tile.number) && tile.number >= 1 && tile.number <= 9, "numbered-tile", `数牌の数字が不正です: ${tile.id}`);
      push(tile.isHonor === false, "numbered-honor-flag", `数牌の isHonor が不正です: ${tile.id}`);
      push(tile.isTerminal === (tile.number === 1 || tile.number === 9), "terminal-flag", `么九牌フラグが不正です: ${tile.id}`);
    }
  }

  const rulesetIds = new Set(rules.rulesets.map((item) => item.id));
  push(rulesetIds.has(manifest.ruleset), "manifest-ruleset", `manifest の ruleset が存在しません: ${manifest.ruleset}`);

  for (const item of yaku.yaku) {
    push(["normal", "yakuman"].includes(item.category), "yaku-category", `役カテゴリが不正です: ${item.id}`);
    push(item.standard === true, "yaku-standard", `標準役データに standard=false が混入しています: ${item.id}`);
    if (item.category === "normal") {
      push(Number.isInteger(item.closedHan) && item.closedHan >= 1, "yaku-closed-han", `通常役の門前翻数が不正です: ${item.id}`);
      push(item.openHan === null || (Number.isInteger(item.openHan) && item.openHan >= 1), "yaku-open-han", `通常役の副露翻数が不正です: ${item.id}`);
      push(item.yakumanValue === 0, "normal-yakuman-value", `通常役に役満倍率があります: ${item.id}`);
    } else {
      push(item.closedHan === null && item.openHan === null, "yakuman-han", `役満に通常翻数が設定されています: ${item.id}`);
      push(item.yakumanValue >= 1, "yakuman-value", `役満倍率が不正です: ${item.id}`);
    }
  }

  const termIds = new Set(terms.terms.map((item) => item.id));
  const lessonIds = new Set(lessons.lessons.map((item) => item.id));

  for (const term of terms.terms) {
    push(Boolean(term.nameJa && term.readingJa && term.readingKana && term.shortDescription), "term-required", `用語の必須項目が不足しています: ${term.id}`);
    for (const ref of term.relatedTerms ?? []) push(termIds.has(ref), "term-reference", `${term.id} の関連用語が存在しません: ${ref}`);
    for (const ref of term.lessonRefs ?? []) push(lessonIds.has(ref), "term-lesson-reference", `${term.id} の学習ページ参照が存在しません: ${ref}`);
  }

  for (const lesson of lessons.lessons) {
    for (const ref of lesson.prerequisites ?? []) push(lessonIds.has(ref), "lesson-prerequisite", `${lesson.id} の前提ページが存在しません: ${ref}`);
    for (const ref of lesson.terms ?? []) push(termIds.has(ref), "lesson-term-reference", `${lesson.id} の用語参照が存在しません: ${ref}`);
  }

  const visiting = new Set();
  const visited = new Set();
  const lessonMap = new Map(lessons.lessons.map((item) => [item.id, item]));
  const visit = (id) => {
    if (visiting.has(id)) {
      errors.push({ code: "lesson-cycle", message: `学習ページの前提関係が循環しています: ${id}` });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const ref of lessonMap.get(id)?.prerequisites ?? []) visit(ref);
    visiting.delete(id);
    visited.add(id);
  };
  for (const lesson of lessons.lessons) visit(lesson.id);

  if (manifest.expected?.tileTypes !== tiles.tiles.length) {
    warnings.push({ code: "manifest-tile-count", message: "manifest.expected.tileTypes と実データ件数が一致しません。" });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateTileInstances(instances, tileDefinitions) {
  const errors = [];
  const validIds = new Set(tileDefinitions.map((tile) => tile.id));
  const counts = new Map();

  for (const instance of instances) {
    if (!validIds.has(instance.tile)) {
      errors.push({ code: "unknown-tile", message: `未定義の牌です: ${instance.tile}` });
      continue;
    }
    counts.set(instance.tile, (counts.get(instance.tile) ?? 0) + 1);
    if (instance.red === true && !["tile-5m", "tile-5p", "tile-5s"].includes(instance.tile)) {
      errors.push({ code: "invalid-red-tile", message: `赤牌として扱えない牌です: ${instance.tile}` });
    }
  }

  for (const [tile, count] of counts) {
    if (count > 4) errors.push({ code: "too-many-identical-tiles", message: `同一種類の牌が5枚以上あります: ${tile} (${count}枚)` });
  }

  return { ok: errors.length === 0, errors };
}