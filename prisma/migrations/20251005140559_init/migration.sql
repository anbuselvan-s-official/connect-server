/*
  Warnings:

  - Changed the type of `signature` on the `SignedPreKey` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "SignedPreKey" DROP COLUMN "signature",
ADD COLUMN     "signature" BYTEA NOT NULL;
