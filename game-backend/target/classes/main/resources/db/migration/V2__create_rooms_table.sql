CREATE TABLE rooms (
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