-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `companyLogo` VARCHAR(191) NULL,
    ADD COLUMN `companyDisplayType` VARCHAR(191) NOT NULL DEFAULT 'text';
