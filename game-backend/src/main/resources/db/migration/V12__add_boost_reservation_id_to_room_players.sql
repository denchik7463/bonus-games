ALTER TABLE room_players
    ADD COLUMN IF NOT EXISTS boost_reservation_id UUID;

CREATE INDEX IF NOT EXISTS idx_room_players_boost_reservation_id
    ON room_players(boost_reservation_id);

