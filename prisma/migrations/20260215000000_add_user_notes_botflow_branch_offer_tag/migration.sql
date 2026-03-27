-- CreateTable: Private internal notes on users (Supervisor/Admin only)
CREATE TABLE `UserNote` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserNote_userId_idx`(`userId`),
    INDEX `UserNote_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: BotFlow per center (branch)
ALTER TABLE `BotFlow` ADD COLUMN `branchId` VARCHAR(191) NULL;

-- AlterTable: Offer optional tag to assign when sending
ALTER TABLE `Offer` ADD COLUMN `tagToAssign` VARCHAR(191) NULL;

-- AddForeignKey UserNote -> User (userId)
ALTER TABLE `UserNote` ADD CONSTRAINT `UserNote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey UserNote -> User (createdById)
ALTER TABLE `UserNote` ADD CONSTRAINT `UserNote_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey BotFlow -> Branch
ALTER TABLE `BotFlow` ADD CONSTRAINT `BotFlow_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex BotFlow branchId
CREATE INDEX `BotFlow_branchId_idx` ON `BotFlow`(`branchId`);
