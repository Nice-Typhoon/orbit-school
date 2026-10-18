# Repository layout

- This directory is the GitHub repository; `school/` is an ordinary source directory, not a submodule. Run project commands from `school/` and Git commands from the repository root.
- Never create or restore a `.git` entry inside `school/`. That turns the source directory back into a gitlink when staged from the root.
- The previous Sites Git history is preserved in the ignored `.repository-backups/school-sites.git`. Do not upload this backup, local secrets, local databases, generated builds, or dependencies.
- For Sites publication, use a separate ignored checkout under `.sites-publish/`. Open it through the Sites source workflow with the existing project ID from `school/.openai/hosting.json`, copy the reviewed project sources there without Git metadata or local runtime state, and build and publish from that separate checkout. Keep the GitHub repository and its `school/` directory intact.
