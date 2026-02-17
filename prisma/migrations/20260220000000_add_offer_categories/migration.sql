-- CreateTable
CREATE TABLE `OfferCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryBranch` (
    `categoryId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`categoryId`, `branchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add categoryId to Offer
ALTER TABLE `Offer` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Offer_categoryId_idx` ON `Offer`(`categoryId`);

-- AddForeignKey
ALTER TABLE `CategoryBranch` ADD CONSTRAINT `CategoryBranch_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `OfferCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryBranch` ADD CONSTRAINT `CategoryBranch_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `OfferCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
