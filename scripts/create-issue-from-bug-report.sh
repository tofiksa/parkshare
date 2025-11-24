#!/bin/bash

# Wrapper script for å opprette GitHub issue fra BUG_REPORT.md
# Bruk: ./scripts/create-issue-from-bug-report.sh

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN miljøvariabel er ikke satt"
  echo ""
  echo "Slik setter du det opp:"
  echo "1. Gå til: https://github.com/settings/tokens"
  echo "2. Klikk 'Generate new token (classic)'"
  echo "3. Velg scope: repo"
  echo "4. Kopier tokenet og sett det:"
  echo "   export GITHUB_TOKEN=ghp_ditt_token_her"
  echo ""
  exit 1
fi

if [ ! -f "BUG_REPORT.md" ]; then
  echo "❌ BUG_REPORT.md ikke funnet"
  exit 1
fi

TITLE="Bug: User type not correctly identified in session"
BODY=$(cat BUG_REPORT.md)
LABELS="bug,high priority"

echo "📝 Oppretter GitHub issue..."
echo "   Tittel: $TITLE"
echo "   Labels: $LABELS"
echo ""

node scripts/create-github-issue.js "$TITLE" "$BODY" "$LABELS"

