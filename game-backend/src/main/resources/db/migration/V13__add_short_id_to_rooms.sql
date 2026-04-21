ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS short_id VARCHAR(6);

WITH numbered AS (
    SELECT id,
           LPAD(ROW_NUMBER() OVER (ORDER BY created_at, id)::text, 6, '0') AS sid
    FROM rooms
    WHERE short_id IS NULL
)
UPDATE rooms r
SET short_id = n.sid
FROM numbered n
WHERE r.id = n.id;

ALTER TABLE rooms
    ALTER COLUMN short_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rooms_short_id
    ON rooms(short_id);

