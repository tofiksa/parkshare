/**
 * Migration and Seed Script
 * 
 * Dette scriptet:
 * 1. Genererer Prisma Client
 * 2. Oppdaterer database schema (db push eller migrate dev)
 * 3. Kjører seed script for test data
 * 
 * Bruk: 
 *   npm run db:migrate:seed          - Bruker db push (rask, for utvikling)
 *   npm run db:migrate:seed -- --migrate  - Bruker migrate dev (lager migration filer)
 * 
 * eller: npx tsx scripts/migrate-and-seed.ts [--migrate]
 */

import { execSync } from "child_process"
import { existsSync, readFileSync } from "fs"
import { join } from "path"

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[36m",
}

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step: number, total: number, message: string) {
  log(`[${step}/${total}] ${message}`, "blue")
}

function logSuccess(message: string) {
  log(`✅ ${message}`, "green")
}

function logError(message: string) {
  log(`❌ ${message}`, "red")
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, "yellow")
}

async function main() {
  // Sjekk om --migrate flag er satt
  const useMigrations = process.argv.includes("--migrate")
  const migrationMethod = useMigrations ? "migrate dev" : "db push"

  log("\n🚀 Starter migration og seed prosess...\n", "blue")
  log(`📦 Metode: ${migrationMethod}`, "blue")
  if (useMigrations) {
    log("   (Lager migration filer for versjonskontroll)", "yellow")
  } else {
    log("   (Rask synkronisering, ingen migration filer)", "yellow")
  }
  log("")

  // Sjekk at .env.local eksisterer
  const envPath = join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) {
    logError(".env.local fil ikke funnet!")
    logWarning("Vennligst opprett .env.local fil med DATABASE_URL")
    process.exit(1)
  }

  // Last inn environment variables fra .env.local
  try {
    const envContent = readFileSync(envPath, "utf-8")
    const envLines = envContent.split("\n")
    for (const line of envLines) {
      if (line.trim() && !line.startsWith("#")) {
        const [key, ...valueParts] = line.split("=")
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "") // Fjern quotes
          process.env[key.trim()] = value
        }
      }
    }
  } catch (error) {
    logError("Kunne ikke lese .env.local fil")
    process.exit(1)
  }

  // Sjekk at DATABASE_URL er satt
  if (!process.env.DATABASE_URL) {
    logError("DATABASE_URL ikke funnet i .env.local")
    process.exit(1)
  }

  const steps = [
    {
      name: "Generer Prisma Client",
      command: "npx prisma generate",
    },
    {
      name: useMigrations 
        ? "Kjør Prisma migrations (lager migration filer)"
        : "Push Prisma schema til database (rask synkronisering)",
      command: useMigrations
        ? "npx prisma migrate dev --name update_schema"
        : "npx prisma db push --accept-data-loss",
    },
    {
      name: "Seed test data",
      command: "npx tsx scripts/seed-test-data.ts",
    },
  ]

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      logStep(i + 1, steps.length, step.name)

      try {
        execSync(step.command, {
          stdio: "inherit",
          cwd: process.cwd(),
          env: process.env,
        })
        logSuccess(`${step.name} fullført`)
      } catch (error) {
        logError(`${step.name} feilet`)
        throw error
      }
    }

    log("\n✨ Migration og seed prosess fullført!\n", "green")
    log("📋 Test-brukere:", "blue")
    log("   Utleier: utleier@test.no / test123456", "reset")
    log("   Leietakere: leietaker@test.no / test123456", "reset")
    log("              leietaker2@test.no / test123456", "reset")
    log("              leietaker3@test.no / test123456", "reset")
    log("\n🌐 Applikasjonen kjører på: http://localhost:3000\n", "blue")
  } catch (error) {
    logError("\nMigration og seed prosess feilet!")
    if (error instanceof Error) {
      logError(`Feil: ${error.message}`)
    }
    process.exit(1)
  }
}

main()

