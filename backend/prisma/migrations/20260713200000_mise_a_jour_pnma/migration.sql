-- AlterEnum UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEAM_LEAD';

-- AlterEnum IncidentDomain
CREATE TYPE "IncidentDomain" AS ENUM ('ASSISTANCE', 'SECOURS', 'MEDICAL');

-- AlterEnum IncidentType
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'REMOTE_DIAGNOSIS';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'ON_SITE_REPAIR';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'EVACUATION';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'REPLACEMENT_VEHICLE';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'RESCUE';

-- AlterEnum IncidentStatus
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'REDIRECTED';

-- New enums
CREATE TYPE "MedicalMeasure" AS ENUM (
  'HEALTH_REFERRAL',
  'ACTIVATE_HEALTH_FOCAL',
  'FORWARD_FOLLOWUP_UNIT',
  'HOSPITAL_CARE_PLAN',
  'TRANSFER_FINANCE',
  'ACTIVATE_INSURER_FOCAL',
  'PNMA_FINANCIAL_ENGAGEMENT',
  'INSURER_FOLLOWUP',
  'RECOVERY_ACTIVATION'
);

CREATE TYPE "RescueCategory" AS ENUM ('ALERT_SERVICES', 'ONSITE_EMERGENCY');

CREATE TYPE "RescueAction" AS ENUM (
  'FIREFIGHTERS',
  'GENDARMERIE_POLICE',
  'OTHER_HOMOLOGATED',
  'ZONE_SECURE',
  'ALERT_PNMA',
  'FIRST_AID',
  'PERSON_SECURE_EVAC'
);

CREATE TYPE "CallSessionStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CALL_EXCEED';

-- OfferPlan
ALTER TABLE "OfferPlan" ADD COLUMN IF NOT EXISTS "replacementVehicleIncluded" BOOLEAN NOT NULL DEFAULT false;

-- SubscriberProfile
ALTER TABLE "SubscriberProfile" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'Dakar';

-- Incident
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "domain" "IncidentDomain" NOT NULL DEFAULT 'ASSISTANCE';
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "replacementEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "redirectedService" TEXT;

-- MedicalPrefinance
ALTER TABLE "MedicalPrefinance" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- CallSession
CREATE TABLE IF NOT EXISTS "CallSession" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "incidentId" TEXT,
    "packetMinutes" INTEGER NOT NULL DEFAULT 5,
    "packetsUsed" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "elapsedSec" INTEGER NOT NULL DEFAULT 0,
    "countdownRemain" INTEGER NOT NULL DEFAULT 300,
    "exceeded" BOOLEAN NOT NULL DEFAULT false,
    "status" "CallSessionStatus" NOT NULL DEFAULT 'OPEN',
    "decision" TEXT,
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CallSession_reference_key" ON "CallSession"("reference");

-- MedicalBudgetConfig
CREATE TABLE IF NOT EXISTS "MedicalBudgetConfig" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "region" TEXT,
    "objectiveFcfa" INTEGER NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MedicalBudgetConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MedicalBudgetConfig_year_month_region_key" ON "MedicalBudgetConfig"("year", "month", "region");

-- IncidentRescueAction
CREATE TABLE IF NOT EXISTS "IncidentRescueAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "category" "RescueCategory" NOT NULL,
    "action" "RescueAction" NOT NULL,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentRescueAction_pkey" PRIMARY KEY ("id")
);

-- IncidentMedicalMeasure
CREATE TABLE IF NOT EXISTS "IncidentMedicalMeasure" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "measure" "MedicalMeasure" NOT NULL,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentMedicalMeasure_pkey" PRIMARY KEY ("id")
);

-- FKs
DO $$ BEGIN
  ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IncidentRescueAction" ADD CONSTRAINT "IncidentRescueAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IncidentMedicalMeasure" ADD CONSTRAINT "IncidentMedicalMeasure_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
