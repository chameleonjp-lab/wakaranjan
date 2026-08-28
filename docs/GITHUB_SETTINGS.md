# GitHub公開運用設定

対象リポジトリ：`chameleonjp-lab/wakaranjan`

## mainの保護

GitHubの `Settings → Branches` から、`main` にブランチ保護ルールまたはRulesetを設定する。

- Pull Requestを必須にする
- 承認レビューを1件以上必須にする
- `Validate mahjong logic / validate` を必須ステータスチェックにする
- mainへの直接pushを禁止する
- force pushを禁止する
- ブランチ削除を禁止する
- 管理者の回避は緊急時だけに限定する

設定後、mainのブランチ画面で保護が有効になっていることと、必須チェック名が一致していることを確認する。

## ワークフローの役割

- `validate.yml`：Pull Request専用の検査。必須チェックとして利用する。
- `deploy-pages.yml`：mainへのマージ後に検査を1回行い、GitHub Pagesへ公開する。

同じmain pushで検査を二重実行しない構成にしている。mainを保護しないまま直接pushすると公開処理が起動するため、保護設定は公開前に必ず行う。

## 現在の確認結果

この作業で確認できたmainは、保護が無効の状態だった。GitHub設定の書き込み操作はこの作業環境から提供されていないため、保護ルールそのものは変更していない。上記手順でユーザーが設定した後に、再確認する。
