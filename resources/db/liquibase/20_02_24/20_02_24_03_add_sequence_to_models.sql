--liquibase formatted sql

--changeset d.kravchenko:20_02_24_03_add_sequence_to_models
--comment: Добавление sequence models_seq

create sequence models_seq
    cache 10;


