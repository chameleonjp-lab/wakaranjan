# GitHub公開運用設定

対象リポジトリ：`chameleonjp-lab/wakaranjan`

## 作業開始時の確認

2026年8月29日、`main`の先頭 `b98bc773b2e42c25da656978dd3174b660e98fab` を確認した時点では、GitHub APIの結果は次のとおりでした。

- `main`：`protected: false`
- リポジトリRulesets：なし
- 未マージPull Request：なし
- 最新の `Deploy GitHub Pages`：成功
- 必須検査候補：`Validate mahjong logic / validate`

この作業環境のGitHub連携では、ブランチ保護の読み取りが403になり、設定を書き込む機能も提供されていません。そのため、コードと検査の改善は実施しましたが、`main`の保護そのものはユーザーがGitHub画面から設定してください。

## iPhoneからmainを保護する

GitHubで対象リポジトリを開き、`Settings` → `Branches`へ進みます。画面に「Add branch ruleset」がある場合はRulesetを使い、ない場合は「Add branch protection rule」を使います。対象ブランチは `main` です。

次を設定します。

- Pull Requestを必須にする
- 承認レビューを1件以上必須にする
- 必須ステータスチェックに `Validate mahjong logic / validate` を追加する
- 管理者を含めて保護を適用し、通常のバイパスを許可しない
- force pushを許可しない
- ブランチ削除を許可しない
- 管理者用の常用バイパスを登録しない。緊急時だけ管理者が保護設定を一時変更する

Rulesetの場合は、対象ブランチに `main` を指定し、Enforcementを有効にします。Branch protection ruleの場合も、上記の項目が有効になっていることを確認して保存します。

## 設定後の確認

1. `main`のブランチ画面に保護中の表示があり、対象が `main`になっていることを確認する。
2. 必須チェック名が `Validate mahjong logic / validate` と完全一致していることを確認する。
3. Pull Requestの画面で、検査が成功するまでマージできない表示になることを確認する。
4. Pages公開はPull Requestをmainへ反映したあとだけ起動し、`Deploy GitHub Pages`内の公開前検査が成功してからデプロイされることを確認する。

保護設定完了前は、mainを「検査なしで変更できない」と判定しません。

## ワークフローの役割

- `.github/workflows/validate.yml`：Pull Requestの必須検査。ジョブ名は `validate` です。
- `.github/workflows/deploy-pages.yml`：main反映後に同じ検査を `_site`へ実行し、成功した成果物だけをGitHub Pagesへ公開します。
- `.github/actions/release-checks/action.yml`：`npm test`、Pagesファイル生成、Chromium、WebKitの共通処理です。

同じ検査コードをPull Request用と公開用に複製していません。Pull Request検査と公開前検査は必要な役割が異なるため、公開前検査は残し、無意味な同一ジョブの追加実行は避けています。
