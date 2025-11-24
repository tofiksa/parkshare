#!/usr/bin/env node

/**
 * Script for å legge til labels på GitHub issue
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'tofiksa';
const REPO_NAME = 'parkshare';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN miljøvariabel er ikke satt');
  process.exit(1);
}

const issueNumber = process.argv[2];
const labels = process.argv[3] ? process.argv[3].split(',').map(l => l.trim()).filter(l => l.length > 0) : [];

if (!issueNumber) {
  console.error('❌ Issue nummer er påkrevd');
  console.error('   Bruk: node scripts/add-labels-to-issue.js <issue_number> <label1,label2,...>');
  process.exit(1);
}

if (labels.length === 0) {
  console.error('❌ Ingen labels oppgitt');
  process.exit(1);
}

const labelData = JSON.stringify(labels);

const authHeader = GITHUB_TOKEN.startsWith('ghp_') 
  ? `token ${GITHUB_TOKEN}` 
  : `Bearer ${GITHUB_TOKEN}`;

const options = {
  hostname: 'api.github.com',
  path: `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels`,
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'User-Agent': 'Parkshare-Issue-Creator',
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'Content-Length': labelData.length
  }
};

console.log(`🏷️  Legger til labels på issue #${issueNumber}: ${labels.join(', ')}...`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Labels lagt til!');
    } else {
      console.error(`❌ Feil ved opprettelse av labels (${res.statusCode})`);
      try {
        const error = JSON.parse(data);
        console.error(`   Melding: ${error.message}`);
        if (res.statusCode === 404) {
          console.error('   💡 Issue eller label ikke funnet');
        }
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

req.write(labelData);
req.end();

