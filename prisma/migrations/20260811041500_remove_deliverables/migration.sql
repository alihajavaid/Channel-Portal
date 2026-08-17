-- Historical activity-log rows referencing the removed "deliverable" category can't survive
-- the enum shrink below; the feature itself (and its own audit trail) is gone with it.
DELETE FROM `activitylogentry` WHERE `category` = 'deliverable';

-- DropForeignKey
ALTER TABLE `deliverable` DROP FOREIGN KEY `Deliverable_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `deliverabletask` DROP FOREIGN KEY `DeliverableTask_deliverableId_fkey`;

-- AlterTable
ALTER TABLE `activitylogentry` MODIFY `category` ENUM('channel_account', 'customer', 'user', 'permission_change', 'export') NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `deliverables`;

-- DropTable
DROP TABLE `deliverable`;

-- DropTable
DROP TABLE `deliverabletask`;

