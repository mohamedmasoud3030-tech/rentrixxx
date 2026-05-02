# Branch Protection for `main`

## الهدف
منع الدمج إلى `main` إذا فشلت أي فحوصات CI المطلوبة.

## GitHub Settings
1. اذهب إلى: **Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `main`.
3. فعّل:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging**
   - **Require branches to be up to date before merging**
4. ضمن Required status checks، اختر:
   - `install-typecheck-lint-test-build`
   - `validate-commits`
   - `typecheck`

> بعد حفظ القاعدة، أي Pull Request لن يُسمح بدمجه إذا فشلت الفحوصات المطلوبة.
