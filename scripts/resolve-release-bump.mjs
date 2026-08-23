const title = process.env.PR_TITLE || '';
const labels = (process.env.PR_LABELS || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean);

if (labels.includes('release:skip')) {
  process.stdout.write('skip');
  process.exit(0);
}
if (labels.includes('release:major')) {
  process.stdout.write('major');
  process.exit(0);
}
if (labels.includes('release:minor')) {
  process.stdout.write('minor');
  process.exit(0);
}
if (labels.includes('release:patch')) {
  process.stdout.write('patch');
  process.exit(0);
}

if (/^[a-z]+(?:\([^)]+\))?!:/.test(title) || /BREAKING CHANGE/i.test(title)) {
  process.stdout.write('major');
} else if (/^feat(?:\([^)]+\))?:/.test(title)) {
  process.stdout.write('minor');
} else {
  process.stdout.write('patch');
}
