/*
  Warnings:

  - A unique constraint covering the columns `[key_id]` on the table `OneTimePreKey` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OneTimePreKey_key_id_key" ON "OneTimePreKey"("key_id");
