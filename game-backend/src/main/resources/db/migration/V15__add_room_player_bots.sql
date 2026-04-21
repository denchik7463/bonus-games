ALTER TABLE room_players
    ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_room_players_is_bot
    ON room_players(is_bot);
