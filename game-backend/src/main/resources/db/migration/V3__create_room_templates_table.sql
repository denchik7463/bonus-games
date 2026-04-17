create table if not exists room_templates (
    id uuid primary key,
    template_name varchar(100) not null unique,
    active boolean not null,
    entry_cost integer not null check (entry_cost >= 0),
    bonus_enabled boolean not null,
    bonus_price integer not null default 0 check (bonus_price >= 0),
    bonus_weight integer not null default 0 check (bonus_weight >= 0),
    max_players integer not null check (max_players between 1 and 10),
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint chk_room_templates_bonus_values
        check (
            (bonus_enabled = true and bonus_price >= 0 and bonus_weight >= 0)
            or
            (bonus_enabled = false and bonus_price = 0 and bonus_weight = 0)
        )
);
