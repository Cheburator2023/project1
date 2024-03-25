--liquibase formatted sql

--changeset d.kravchenko:26_12_23_01_add_default_template_group
--comment: Добавление дефолтной группы шаблонов

INSERT INTO template_groups (group_label)
VALUES ('Доступные по умолчанию');

