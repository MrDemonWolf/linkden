-- LinkDen is a single-admin app. Enforce it at the database level so a
-- concurrent double sign-up cannot race past the middleware check-then-create.
CREATE TRIGGER enforce_single_user
BEFORE INSERT ON "user"
WHEN (SELECT COUNT(*) FROM "user") >= 1
BEGIN
	SELECT RAISE(ABORT, 'Only one admin user is allowed');
END;
