#!/usr/bin/env node

/**
 * Script for å opprette GitHub issues via GitHub API
 *
 * Bruk:
 *   GITHUB_TOKEN=<token> node scripts/create-github-issue.js <title> <body> [labels]
 *
 * Eksempel:
 *   GITHUB_TOKEN=ghp_xxx node scripts/create-github-issue.js "Bug: User type not identified" "$(cat BUG_REPORT.md)" "bug,high priority"
 */

const https = require("https");
const { execSync } = require("child_process");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "tofiksa";
const REPO_NAME = "parkshare";

if (!GITHUB_TOKEN) {
	console.error("❌ GITHUB_TOKEN miljøvariabel er ikke satt");
	console.error("   Hent en token fra: https://github.com/settings/tokens");
	console.error('   Token trenger "repo" scope');
	process.exit(1);
}

const fs = require("fs");

const title = process.argv[2];
let body = process.argv[3] || "";

// Hvis body er en filsti eller "BUG_REPORT.md", les filen
if (
	body === "BUG_REPORT.md" ||
	(body === "" && process.argv[3] === undefined)
) {
	// Prøv å lese BUG_REPORT.md hvis den eksisterer
	if (fs.existsSync("BUG_REPORT.md")) {
		body = fs.readFileSync("BUG_REPORT.md", "utf8");
	}
}

const labels = process.argv[4]
	? process.argv[4]
			.split(",")
			.map((l) => l.trim())
			.filter((l) => l.length > 0)
	: [];

if (!title) {
	console.error("❌ Tittel er påkrevd");
	console.error(
		"   Bruk: node scripts/create-github-issue.js <title> <body> [labels]",
	);
	process.exit(1);
}

// GitHub API krever at labels er en array, eller ikke sendes i det hele tatt
const payload =
	labels.length > 0
		? {
				title,
				body,
				labels,
			}
		: {
				title,
				body,
			};

// Debug: vis payload struktur (uten å vise hele body)
if (process.env.DEBUG) {
	console.log(
		"Payload:",
		JSON.stringify(
			{ ...payload, body: body.substring(0, 100) + "..." },
			null,
			2,
		),
	);
}

const issueData = JSON.stringify(payload);

// Prøv både "token" og "Bearer" format
const authHeader = GITHUB_TOKEN.startsWith("ghp_")
	? `token ${GITHUB_TOKEN}`
	: `Bearer ${GITHUB_TOKEN}`;

const options = {
	hostname: "api.github.com",
	path: `/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
	method: "POST",
	headers: {
		Authorization: authHeader,
		"User-Agent": "Parkshare-Issue-Creator",
		Accept: "application/vnd.github.v3+json",
		"Content-Type": "application/json",
		"Content-Length": issueData.length,
	},
};

console.log(`📝 Oppretter issue: "${title}"`);
if (labels.length > 0) {
	console.log(`🏷️  Labels: ${labels.join(", ")}`);
}

const req = https.request(options, (res) => {
	let data = "";

	res.on("data", (chunk) => {
		data += chunk;
	});

	res.on("end", () => {
		if (res.statusCode === 201) {
			const issue = JSON.parse(data);
			console.log(`✅ Issue opprettet!`);
			console.log(`🔗 URL: ${issue.html_url}`);
			console.log(`📋 Issue #${issue.number}`);
		} else {
			console.error(`❌ Feil ved opprettelse av issue (${res.statusCode})`);
			try {
				const error = JSON.parse(data);
				if (error.message) {
					console.error(`   Melding: ${error.message}`);

					if (res.statusCode === 401) {
						console.error("\n💡 Tokenet er ugyldig eller utløpt.");
						console.error(
							"   Opprett et nytt token: https://github.com/settings/tokens",
						);
						console.error('   Token trenger "repo" scope');
						console.error(
							"   Sett det: export GITHUB_TOKEN=ghp_ditt_nye_token",
						);
					} else if (res.statusCode === 403) {
						console.error("\n💡 Tokenet mangler nødvendige rettigheter.");
						console.error('   Sjekk at tokenet har "repo" scope');
					} else if (res.statusCode === 404) {
						console.error("\n💡 Repository ikke funnet.");
						console.error(
							`   Sjekk at ${REPO_OWNER}/${REPO_NAME} eksisterer og at du har tilgang`,
						);
					}
				}
			} catch (e) {
				console.error(`   Svar: ${data}`);
			}
			process.exit(1);
		}
	});
});

req.on("error", (error) => {
	console.error(`❌ Feil ved API-kall:`, error.message);
	process.exit(1);
});

req.write(issueData);
req.end();
