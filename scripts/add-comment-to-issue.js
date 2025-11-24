#!/usr/bin/env node

/**
 * Script for å legge til kommentar på GitHub issue
 */

const https = require('https');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'tofiksa';
const REPO_NAME = 'parkshare';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN miljøvariabel er ikke satt');
  process.exit(1);
}

const issueNumber = process.argv[2];
const commentBody = process.argv[3] || (fs.existsSync('BUG_REPORT.md') ? fs.readFileSync('BUG_REPORT.md', 'utf8') : '');

if (!issueNumber) {
  console.error('❌ Issue nummer er påkrevd');
  console.error('   Bruk: node scripts/add-comment-to-issue.js <issue_number> [comment_body]');
  process.exit(1);
}

if (!commentBody) {
  console.error('❌ Kommentar er tom');
  process.exit(1);
}

const commentData = JSON.stringify({
  body: commentBody
});

const authHeader = GITHUB_TOKEN.startsWith('ghp_') 
  ? `token ${GITHUB_TOKEN}` 
  : `Bearer ${GITHUB_TOKEN}`;

const options = {
  hostname: 'api.github.com',
  path: `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`,
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'User-Agent': 'Parkshare-Issue-Creator',
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'Content-Length': commentData.length
  }
};

console.log(`💬 Legger til kommentar på issue #${issueNumber}...`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201) {
      const comment = JSON.parse(data);
      console.log('✅ Kommentar lagt til!');
      console.log(`🔗 URL: ${comment.html_url}`);
    } else {
      console.error(`❌ Feil ved opprettelse av kommentar (${res.statusCode})`);
      try {
        const error = JSON.parse(data);
        console.error(`   Melding: ${error.message}`);
      } catch (e) {
        console.error(`   Svar: ${data.substring(0, 500)}`);
      }
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Feil ved API-kall:`, error.message);
  process.exit(1);
});

req.write(commentData);
req.end();

