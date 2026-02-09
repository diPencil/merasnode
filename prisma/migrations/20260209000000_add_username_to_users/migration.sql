-- AlterTable
-- Add optional username for backward compatibility: existing users keep logging in with email only
ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);
