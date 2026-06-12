CREATE TABLE IF NOT EXISTS "Property" (
  "id"      TEXT NOT NULL PRIMARY KEY,
  "name"    TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "type"    TEXT NOT NULL DEFAULT 'House',
  "rent"    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "phone"      TEXT NOT NULL DEFAULT '',
  "propertyId" TEXT NOT NULL DEFAULT '',
  "leaseStart" TEXT NOT NULL DEFAULT '',
  "leaseEnd"   TEXT NOT NULL DEFAULT '',
  "deposit"    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  "propertyId" TEXT NOT NULL DEFAULT '',
  "amount"     INTEGER NOT NULL,
  "month"      TEXT NOT NULL,
  "method"     TEXT NOT NULL DEFAULT 'Mobile money',
  "datePaid"   TEXT NOT NULL DEFAULT '',
  "batchId"    TEXT,
  "batchCount" INTEGER,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Maintenance" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL DEFAULT '',
  "title"      TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'open',
  "cost"       INTEGER NOT NULL DEFAULT 0,
  "date"       TEXT NOT NULL DEFAULT '',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
