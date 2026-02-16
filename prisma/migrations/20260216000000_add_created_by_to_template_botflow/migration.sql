-- AlterTable Template: من أنشأ القالب
ALTER TABLE `Template` ADD COLUMN `createdById` VARCHAR(191) NULL;
CREATE INDEX `Template_createdById_idx` ON `Template`(`createdById`);
ALTER TABLE `Template` ADD CONSTRAINT `Template_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable BotFlow: من أنشأ السير الآلي
ALTER TABLE `BotFlow` ADD COLUMN `createdById` VARCHAR(191) NULL;
CREATE INDEX `BotFlow_createdById_idx` ON `BotFlow`(`createdById`);
ALTER TABLE `BotFlow` ADD CONSTRAINT `BotFlow_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
