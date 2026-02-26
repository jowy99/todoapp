-- Add optional username so existing users can keep logging in with email.
ALTER TABLE "User"
ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
