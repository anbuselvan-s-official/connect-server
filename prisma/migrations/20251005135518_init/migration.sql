/*
  Warnings:

  - You are about to drop the column `consumed` on the `OneTimePreKey` table. All the data in the column will be lost.
  - The primary key for the `SignedPreKey` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `SignedPreKey` table. All the data in the column will be lost.
  - You are about to drop the column `key_id` on the `SignedPreKey` table. All the data in the column will be lost.
  - Changed the type of `public_key` on the `OneTimePreKey` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `expires_at` to the `SignedPreKey` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `public_key` on the `SignedPreKey` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "OneTimePreKey" DROP COLUMN "consumed",
ADD COLUMN     "is_used" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "public_key",
ADD COLUMN     "public_key" BYTEA NOT NULL;

-- AlterTable
ALTER TABLE "SignedPreKey" DROP CONSTRAINT "SignedPreKey_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "key_id",
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "public_key",
ADD COLUMN     "public_key" BYTEA NOT NULL,
ADD CONSTRAINT "SignedPreKey_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SignedPreKey_id_seq";
