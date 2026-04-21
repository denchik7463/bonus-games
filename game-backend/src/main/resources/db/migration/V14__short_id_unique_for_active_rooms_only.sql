DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT c.conname
        FROM pg_constraint c
                 JOIN pg_class t ON t.oid = c.conrelid
                 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
        WHERE t.relname = 'rooms'
          AND c.contype = 'u'
          AND a.attname = 'short_id'
    LOOP
        EXECUTE format('ALTER TABLE rooms DROP CONSTRAINT IF EXISTS %I', rec.conname);
    END LOOP;
END $$;

DROP INDEX IF EXISTS uq_rooms_short_id;
DROP INDEX IF EXISTS uk_rooms_short_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rooms_short_id_active
    ON rooms(short_id)
    WHERE status IN ('WAITING', 'FULL');

