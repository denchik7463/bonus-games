CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    max_players INT NOT NULL,
    entry_cost INT NOT NULL,
    prize_fund INT NOT NULL,
    boost_allowed BOOLEAN NOT NULL,
    bot_count INT NOT NULL,
    room_status VARCHAR(50) NOT NULL,
    winner_player_external_id VARCHAR(100) NOT NULL,
    winner_player_name VARCHAR(100) NOT NULL,
    winner_position_index INT NOT NULL,
    base_weight INT,
    boost_bonus INT,
    total_weight INT,
    roll INT,
    random_hash VARCHAR(255),
    random_seed VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_game_results_room FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS game_result_players (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    game_result_id UUID NOT NULL,
    position_index INT NOT NULL,
    player_external_id VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    is_bot BOOLEAN NOT NULL,
    boost_used BOOLEAN NOT NULL,
    final_weight INT NOT NULL,
    balance_before BIGINT,
    balance_after BIGINT,
    balance_delta BIGINT,
    status VARCHAR(50),
    is_winner BOOLEAN NOT NULL,
    CONSTRAINT fk_game_result_players_result
        FOREIGN KEY (game_result_id) REFERENCES game_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_results_room_id
    ON game_results(room_id);

CREATE INDEX IF NOT EXISTS idx_game_results_created_at
    ON game_results(created_at);

CREATE INDEX IF NOT EXISTS idx_game_result_players_result_id
    ON game_result_players(game_result_id);