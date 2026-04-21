DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_room_players_room_user'
    ) THEN
        DROP INDEX uq_room_players_room_user;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_room_players_room_seat
    ON room_players(room_id, player_order)
    WHERE player_order IS NOT NULL;
