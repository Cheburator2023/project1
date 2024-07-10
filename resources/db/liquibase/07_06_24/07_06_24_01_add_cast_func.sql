--liquibase formatted sql

--changeset d.kravchenko: 07_06_24_01_add_cast_func
--comment: Добавление helper функций для безопасного приведения типов

CREATE OR REPLACE FUNCTION safe_cast_boolean(text) RETURNS boolean
    LANGUAGE plpgsql
AS
$$
BEGIN
    RETURN $1::Boolean;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION safe_cast_boolean_array(input_text_array text[]) RETURNS boolean[]
    LANGUAGE plpgsql
AS
$$
DECLARE
    result Boolean[] := '{}';
    elem   Text;
BEGIN
    FOREACH elem IN ARRAY input_text_array
        LOOP
            BEGIN
                result := ARRAY_APPEND(result, elem::Boolean);
            EXCEPTION
                WHEN OTHERS THEN
                    result := ARRAY_APPEND(result, NULL);
            END;
        END LOOP;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION safe_cast_timestamp(text) RETURNS timestamp without time zone
    LANGUAGE plpgsql
AS
$$
BEGIN
    RETURN $1::Timestamp;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

--rollback DROP FUNCTION IF EXISTS safe_cast_boolean;
--rollback DROP FUNCTION IF EXISTS safe_cast_boolean_array;
--rollback DROP FUNCTION IF EXISTS safe_cast_timestamp;
