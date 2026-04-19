ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS first_player_joined_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

ALTER TABLE room_players
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS wallet_reservation_id UUID,
    ADD COLUMN IF NOT EXISTS boost_used BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS round_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS player_order INT,
    ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'room_players'
          AND column_name = 'player_id'
    ) THEN
        ALTER TABLE room_players
            ALTER COLUMN player_id DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_room_players_room_id_player_order
    ON room_players(room_id, player_order);

CREATE INDEX IF NOT EXISTS idx_room_players_user_id
    ON room_players(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_room_players_room_user
    ON room_players(room_id, user_id)
    WHERE user_id IS NOT NULL;
