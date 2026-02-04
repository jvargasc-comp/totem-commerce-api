-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "deliveryCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "shippingProvider" TEXT
);
INSERT INTO "new_Order" ("createdAt", "customerName", "customerPhone", "deliveryCents", "id", "status", "subtotalCents", "totalCents", "updatedAt") SELECT "createdAt", "customerName", "customerPhone", "deliveryCents", "id", "status", "subtotalCents", "totalCents", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
