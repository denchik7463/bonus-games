CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY,
    max_players INT NOT NULL,
    entry_cost INT NOT NULL,
    prize_fund INT NOT NULL,
    boost_allowed BOOLEAN NOT NULL,
    timer_seconds INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_players INT NOT NULL,
    bot_count INT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS room_players (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id UUID NOT NULL,
    player_id BIGINT NOT NULL,
    join_time TIMESTAMP NOT NULL,
    status VARCHAR(255)
);

-- Добавляем внешний ключ, если его нет
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_room') THEN
        ALTER TABLE room_players
        ADD CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id);
    END IF;
END $$;