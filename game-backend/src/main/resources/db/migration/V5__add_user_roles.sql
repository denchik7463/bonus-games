alter table users
    add column if not exists role varchar(20);

update users
set role = 'USER'
where role is null;

alter table users
    alter column role set not null;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role
                CHECK (role IN ('USER', 'ADMIN', 'EXPERT'));
    END IF;
END $$;
