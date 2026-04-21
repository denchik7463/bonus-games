ALTER TABLE room_templates
    ADD COLUMN IF NOT EXISTS winner_percent INTEGER NOT NULL DEFAULT 100;

ALTER TABLE room_templates
    DROP CONSTRAINT IF EXISTS chk_room_templates_winner_percent;

ALTER TABLE room_templates
    ADD CONSTRAINT chk_room_templates_winner_percent
        CHECK (winner_percent BETWEEN 1 AND 100);

