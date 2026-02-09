#!/usr/bin/env node
/**
 * Create a Pull Request via GitHub API.
 * Requires GITHUB_TOKEN environment variable (with repo scope).
 * Usage: node scripts/create-pr.js
 * Or: GITHUB_TOKEN=xxx node scripts/create-pr.js
 */

const fs = require('fs');
const path = require('path');

const REPO = 'diPencil/merasnode';
const BASE = 'main';
const HEAD = 'feature/username-auth';
const TITLE = 'feat(auth): add username support for login and user management';

const bodyPath = path.join(__dirname, '..', '.pr-body.md');
const body = fs.existsSync(bodyPath)
  ? fs.readFileSync(bodyPath, 'utf8')
  : 'See commit message and changed files.';

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN is not set. Set it and run again to create the PR via API.');
    console.error('Alternatively, open this URL while logged in to GitHub:');
    console.error(`  https://github.com/${REPO}/compare/${BASE}...${HEAD}`);
    process.exit(1);
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/pulls`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: TITLE,
      head: HEAD,
      base: BASE,
      body,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('GitHub API error:', res.status, err);
    process.exit(1);
  }

  const pr = await res.json();
  console.log('Pull Request created:');
  console.log(pr.html_url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
