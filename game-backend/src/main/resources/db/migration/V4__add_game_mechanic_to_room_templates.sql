alter table room_templates
    add column if not exists game_mechanic varchar(100) not null default 'CLASSIC';
