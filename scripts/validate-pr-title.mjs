const title = process.argv.slice(2).join(' ').trim();

if (!title) throw new Error('PR title is required.');

const conventional = /^(feat|fix|perf|refactor|docs|test|build|ci|chore|revert)(\([a-zA-Z0-9._/-]+\))?(!)?:\s+\S+/;
if (!conventional.test(title)) {
  console.error(`
Invalid pull request title:

  ${title}

Use a Conventional Commit-style title, for example:
  feat(detector): add Bun workspace detection
  fix(ci): preserve existing workflow
  docs: clarify workspace trust behavior
  feat!: change baseline ownership model

Release behavior:
  feat / feat(...)       -> minor
  ! / BREAKING CHANGE   -> major
  everything else       -> patch

Release labels override title inference:
  release:major
  release:minor
  release:patch
  release:skip
`);
  process.exit(1);
}
