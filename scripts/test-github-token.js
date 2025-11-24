#!/usr/bin/env node

/**
 * Script for å teste GitHub token
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN miljøvariabel er ikke satt');
  process.exit(1);
}

console.log('🔍 Tester GitHub token...');
console.log(`   Token starter med: ${GITHUB_TOKEN.substring(0, 7)}...`);
console.log(`   Token lengde: ${GITHUB_TOKEN.length} tegn\n`);

// Test med "token" format (for classic tokens)
const testToken = (format) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'Authorization': format === 'token' ? `token ${GITHUB_TOKEN}` : `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Parkshare-Token-Tester',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      resolve({ statusCode: 0, error: error.message });
    });

    req.end();
  });
};

(async () => {
  console.log('📡 Tester med "token" format...');
  const result1 = await testToken('token');
  
  if (result1.statusCode === 200) {
    const user = JSON.parse(result1.data);
    console.log('✅ Token er gyldig!');
    console.log(`   Bruker: ${user.login}`);
    console.log(`   Navn: ${user.name || 'Ikke satt'}`);
    console.log(`   Format: "token" fungerer\n`);
    
    // Test repo access
    console.log('📡 Tester repository tilgang...');
    const repoOptions = {
      hostname: 'api.github.com',
      path: '/repos/tofiksa/parkshare',
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Parkshare-Token-Tester',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const repoReq = https.request(repoOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const repo = JSON.parse(data);
          console.log('✅ Repository tilgang OK!');
          console.log(`   Repository: ${repo.full_name}`);
          console.log(`   Private: ${repo.private ? 'Ja' : 'Nei'}`);
        } else {
          console.log(`❌ Repository tilgang feilet (${res.statusCode})`);
          try {
            const error = JSON.parse(data);
            console.log(`   Melding: ${error.message}`);
            if (res.statusCode === 404) {
              console.log('   💡 Repository ikke funnet eller ingen tilgang');
            } else if (res.statusCode === 403) {
              console.log('   💡 Token mangler "repo" scope');
            }
          } catch (e) {
            console.log(`   Svar: ${data}`);
          }
        }
      });
    });
    
    repoReq.on('error', (error) => {
      console.log(`❌ Feil: ${error.message}`);
    });
    
    repoReq.end();
    
  } else if (result1.statusCode === 401) {
    console.log('❌ Token er ugyldig med "token" format');
    
    console.log('\n📡 Tester med "Bearer" format...');
    const result2 = await testToken('bearer');
    
    if (result2.statusCode === 200) {
      const user = JSON.parse(result2.data);
      console.log('✅ Token er gyldig med "Bearer" format!');
      console.log(`   Bruker: ${user.login}`);
    } else {
      console.log('❌ Token er ugyldig med begge formater');
      console.log('\n💡 Mulige løsninger:');
      console.log('   1. Tokenet er utløpt - opprett et nytt: https://github.com/settings/tokens');
      console.log('   2. Tokenet mangler "repo" scope');
      console.log('   3. Tokenet er feil kopiert - sjekk at det starter med "ghp_"');
      console.log('   4. Tokenet er revokert - sjekk i GitHub Settings');
      process.exit(1);
    }
  } else {
    console.log(`❌ Uventet feil (${result1.statusCode})`);
    try {
      const error = JSON.parse(result1.data);
      console.log(`   Melding: ${error.message}`);
    } catch (e) {
      console.log(`   Svar: ${result1.data}`);
    }
    process.exit(1);
  }
})();

