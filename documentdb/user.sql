CREATE DATABASE postgres
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

COMMENT ON DATABASE postgres
    IS 'default administrative connection database';

-- Table: public.user

-- DROP TABLE IF EXISTS public."user";

CREATE TABLE IF NOT EXISTS public."user"
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    username varchar(50) COLLATE pg_catalog."default" NOT NULL,
    password varchar(50) COLLATE pg_catalog."default" NOT NULL,
    firstname text COLLATE pg_catalog."default",
    lastname text COLLATE pg_catalog."default",
    petname text COLLATE pg_catalog."default",
    phone varchar(10) COLLATE pg_catalog."default",
    address varchar(255) COLLATE pg_catalog."default",
    city text COLLATE pg_catalog."default",
    state character(2) COLLATE pg_catalog."default",
    CONSTRAINT user_pkey PRIMARY KEY (id)
)

    TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."user"
    OWNER to postgres;

INSERT INTO public."user"(
    username, password, firstname, lastname, petname, phone, address, city, state)
VALUES ('ericbo', 'test123', 'eric', 'bowser', 'bunker', '4354948030', '5154 S 5200 W', 'Kearns', 'UT');