CREATE TABLE IF NOT EXISTS round_event_logs (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    game_result_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_title VARCHAR(200) NOT NULL,
    description TEXT,
    payload_json TEXT,
    actor_user_id UUID,
    actor_username VARCHAR(100),
    actor_role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_round_event_logs_room
        FOREIGN KEY (room_id) REFERENCES rooms(id),
    CONSTRAINT fk_round_event_logs_game_result
        FOREIGN KEY (game_result_id) REFERENCES game_results(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_round_event_logs_room_id
    ON round_event_logs(room_id);

CREATE INDEX IF NOT EXISTS idx_round_event_logs_game_result_id
    ON round_event_logs(game_result_id);

CREATE INDEX IF NOT EXISTS idx_round_event_logs_created_at
    ON round_event_logs(created_at);