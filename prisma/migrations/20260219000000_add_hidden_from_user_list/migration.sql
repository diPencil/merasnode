-- AlterTable
-- Hide super-admin (or other system) accounts from the Users list
ALTER TABLE `User` ADD COLUMN `hiddenFromUserList` BOOLEAN NOT NULL DEFAULT false;
