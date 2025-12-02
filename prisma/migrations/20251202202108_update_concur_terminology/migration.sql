-- AlterTable: Rename Index to Designation
ALTER TABLE "Index" RENAME TO "Designation";

-- AlterTable: Rename Account to Category
ALTER TABLE "Account" RENAME TO "Category";

-- AlterTable: Rename foreign key column in Category table
ALTER TABLE "Category" RENAME COLUMN "indexId" TO "designationId";

-- AlterTable: Rename foreign key column in Purchase table
ALTER TABLE "Purchase" RENAME COLUMN "accountId" TO "categoryId";

-- RenameForeignKey: Rename foreign key constraint in Category table
ALTER TABLE "Category" RENAME CONSTRAINT "Account_indexId_fkey" TO "Category_designationId_fkey";

-- RenameForeignKey: Rename foreign key constraint in Purchase table
ALTER TABLE "Purchase" RENAME CONSTRAINT "Purchase_accountId_fkey" TO "Purchase_categoryId_fkey";
