ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS template_id UUID;

CREATE INDEX IF NOT EXISTS idx_rooms_template_status_created
    ON rooms(template_id, status, created_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_rooms_template'
    ) THEN
        ALTER TABLE rooms
            ADD CONSTRAINT fk_rooms_template
                FOREIGN KEY (template_id) REFERENCES room_templates(id);
    END IF;
END $$;
