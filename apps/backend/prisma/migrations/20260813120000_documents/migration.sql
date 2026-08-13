-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientKey" TEXT,
    "description" TEXT,
    "title" TEXT,
    "filename" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "latestVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_version" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "hasInlineScript" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_ownerId_clientKey_key" ON "document"("ownerId", "clientKey");

-- CreateIndex
CREATE INDEX "document_ownerId_updatedAt_idx" ON "document"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_version_documentId_versionNumber_key" ON "document_version"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "document_version_documentId_createdAt_idx" ON "document_version"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
