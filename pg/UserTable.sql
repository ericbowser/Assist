-- Table: public.User
-- DROP DATABASE IF EXISTS postgres;
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

-- DROP TABLE IF EXISTS public."User";
-- Database: postgres
CREATE TABLE IF NOT EXISTS public."User"
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    CONSTRAINT "User_pkey" PRIMARY KEY (id),
    username character varying(200) COLLATE pg_catalog."default" NOT NULL,
    password character varying(200) COLLATE pg_catalog."default" NOT NULL
    )

    TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."User"
    OWNER to postgres;