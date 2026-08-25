# ワカランジャン 共通データモデル v0.1

## 1. 目的

この文書は、解説・問題・用語集・点数計算・対局練習が同じ牌・役・用語・ルール情報を参照するための共通データ仕様を定義する。

`docs/REQUIREMENTS.md` の「共通データ原則」を実装可能な形に具体化する。

ページごとに牌名、役名、翻数、読み方、説明文、点数条件を重複定義してはならない。

## 2. データ配置

初期構成は次を基準とする。

```text
src/data/
├─ manifest.json
├─ tiles.json
├─ terms.json
├─ yaku.json
├─ rules.json
├─ lessons.json
└─ questions/
   ├─ intro/
   ├─ beginner/
   ├─ intermediate/
   ├─ advanced/
   └─ special/
```

実装方式が変更されても、論理的な責任範囲は維持する。

## 3. 識別子の原則

表示名を内部識別子として使わない。

識別子は英小文字、数字、ハイフンを基本とし、公開後は意味が同じ限り変更しない。

例:

- `tile-1m`
- `tile-east`
- `yaku-riichi`
- `term-mentsu`
- `lesson-intro-01`
- `question-wait-000001`

表示名を変更しても、学習記録や問題参照が壊れないことを目的とする。

## 4. 牌データ

34種類の通常牌を基準データとして持ち、赤5は通常5と同じ種類に属する表示差分として扱う。

最低限、次の項目を持つ。

```json
{
  "id": "tile-1m",
  "code": "1m",
  "suit": "man",
  "number": 1,
  "honor": null,
  "nameJa": "一萬",
  "readingJa": "イーワン",
  "shortReading": "1萬",
  "sortOrder": 1,
  "isTerminal": true,
  "isHonor": false,
  "aliases": ["一万", "いーわん"]
}
```

字牌では `number` を `null` とし、`honor` に `east`, `south`, `west`, `north`, `white`, `green`, `red` のいずれかを持たせる。

### 4.1 赤牌

赤5は別種類の牌として34種類に追加しない。

実際の牌インスタンスで次のように表現する。

```json
{
  "tile": "tile-5m",
  "red": true
}
```

通常5と赤5を合わせて同一種類4枚を超えてはならない。

## 5. 役データ

役の正式情報は `yaku.json` のみで管理する。

最低限、次を持つ。

```json
{
  "id": "yaku-riichi",
  "nameJa": "立直",
  "displayNameJa": "リーチ",
  "readingJa": "リーチ",
  "category": "normal",
  "closedHan": 1,
  "openHan": null,
  "yakumanValue": 0,
  "standard": true,
  "lessonLevel": "beginner",
  "summary": "門前でテンパイしたときに宣言する役。",
  "aliases": ["立直"],
  "relatedTerms": ["term-menzen", "term-tenpai"]
}
```

### 5.1 翻数

- `closedHan`: 門前時の翻数
- `openHan`: 副露時の翻数
- 副露不可は `null`
- 役満は通常翻数とは別に `yakumanValue` を使う

ダブル役満など採用ルールで変わる値を、役データに固定値として焼き込まない。標準ルール設定から決定する。

### 5.2 役の成立判定

説明用データと成立判定ロジックは分離する。

`yaku.json` に複雑な判定式を文字列で持たせない。成立判定は共通計算ロジックが担当し、役データは表示・分類・参照情報を担当する。

## 6. 用語データ

用語集は五十音検索だけでなく、解説・役・問題から参照できる共通知識データとする。

```json
{
  "id": "term-shuntsu",
  "nameJa": "順子",
  "readingJa": "シュンツ",
  "readingKana": "しゅんつ",
  "category": "hand-shape",
  "shortDescription": "同じ種類で数字が3つ続く組。",
  "description": "...",
  "aliases": [],
  "relatedTerms": ["term-mentsu", "term-kotsu"],
  "lessonRefs": ["lesson-intro-04"]
}
```

### 6.1 検索

検索対象には次を含める。

- 漢字表記
- カタカナ読み
- ひらがな読み
- 一般的な別表記
- 牌コード

検索のためだけに別の説明文を複製しない。

## 7. 標準ルールデータ

ルール差が判定結果に影響する項目は `rules.json` で管理する。

例:

```json
{
  "id": "wakaranjan-standard-v1",
  "players": 4,
  "redFives": {"man": 1, "pin": 1, "sou": 1},
  "openTanyao": true,
  "kiriageMangan": true,
  "kazoeYakuman": false,
  "multipleRon": "head-bump"
}
```

標準ルール変更時は、問題・計算結果・検査結果への影響を確認する。

## 8. 学習ページデータ

ページ本文そのものをすべてJSON化する必要はないが、学習順序と参照関係は共通管理する。

```json
{
  "id": "lesson-intro-02",
  "level": "intro",
  "order": 2,
  "title": "牌の種類と読み",
  "estimatedMinutes": 5,
  "prerequisites": ["lesson-intro-01"],
  "terms": ["term-manzu", "term-pinzu", "term-souzu", "term-jihai"],
  "questionTags": ["tile-name", "tile-reading"]
}
```

## 9. 問題データとの参照

問題内で役名や牌名を文章として再定義しない。

例:

```json
{
  "id": "question-tile-000001",
  "schemaVersion": 1,
  "ruleset": "wakaranjan-standard-v1",
  "level": "intro",
  "category": "tile-reading",
  "prompt": "この牌の読み方は？",
  "state": {"tiles": [{"tile": "tile-1m", "red": false}]},
  "answer": {"type": "single-choice", "value": "イーワン"},
  "lessonRef": "lesson-intro-02"
}
```

点数・役・待ちに関わる問題は、保存された `answer` だけを信用せず、共通判定機能による再検査が可能であること。

## 10. 表示部品との境界

データは見た目を決めない。

牌画像、横向き牌、選択状態、正誤表示、拡大表示は表示部品が担当する。

データ側では「何の牌か」「赤牌か」「どの位置にあるか」までを渡す。

## 11. アクセシビリティ

すべての牌には、画像がなくても意味が伝わる名称を持たせる。

表示部品は `nameJa` と `readingJa` から読み上げ用ラベルを生成できること。

色だけで赤牌を識別させない。読み上げでは「赤五萬」のように赤牌であることを明示する。

## 12. データ品質検査

最低限、ビルドまたは検査工程で次を確認する。

1. ID重複がない。
2. 参照先IDが存在する。
3. 牌コードが34種類の定義範囲内である。
4. 同一種類の牌が状態内で4枚を超えない。
5. `openHan` と `closedHan` の値が役一覧と矛盾しない。
6. 標準採用しない役が通常問題に混入しない。
7. 学習ページの前提関係に循環がない。
8. 問題の `ruleset` が存在する。
9. 点数・役・待ち問題を共通判定機能で再検証できる。
10. 公開済みIDの無断変更を検知できる。

## 13. 変更ルール

共通データの変更は教材全体に影響するため、次を伴う変更はPRで明示する。

- 牌の識別子
- 役の翻数・採用状態
- 標準ルール
- 用語の意味
- 問題の正解判定に影響する項目

表示文の誤字修正と、判定結果が変わる仕様変更を同じ扱いにしない。


## 14. 局状態とカン

局の状態は、カンを宣言した瞬間と、嶺上牌・追加ドラを処理した瞬間を分けて持つ。

最低限、次の状態を管理する。

- `kanCount`: その局で成立したカンの数
- `pendingKan`: カン宣言後、嶺上牌処理がまだ終わっているか
- `kanDoraIndicators`: カン成立後に追加されたドラ表示牌
- `lastKan`: 種類、宣言者、嶺上牌、追加ドラの記録

カンの宣言だけで通常の牌山を減らしてはならない。牌山側の処理で嶺上牌と追加ドラを確定し、その結果を局状態へ渡す。局が終了したら、カン回数・追加ドラ・保留中のカンを次の局へ持ち越さない。完了した局の記録には、検証できるようカン回数と追加ドラを保存する。
