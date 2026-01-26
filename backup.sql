--
-- PostgreSQL database dump (Fixed for Localhost)
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.email_verification_tokens OWNER TO postgres;

--
-- Name: task_lists; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.task_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_default boolean DEFAULT false
);

ALTER TABLE public.task_lists OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    list_id uuid NOT NULL,
    parent_task_id uuid,
    title text NOT NULL,
    description text,
    is_completed boolean DEFAULT false NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    due_date date,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text,
    name text NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    google_id text
);

ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: email_verification_tokens
--
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('a65d3bfe-6c23-494e-919b-4025af787de8', 'b35bdf91-07eb-4366-949d-5e6815d168ed', 'b0c95ddc8f45160138192f82e4d51d66f75f85af768277aac5b65da2fefe0da6', '2025-12-29 10:32:42.547309+00', '2025-12-28 10:33:04.817837+00', '2025-12-28 10:32:42.547309+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('c2512504-c232-415f-b1bb-33d6ce700daa', '93729248-80f8-4f6f-9f36-e3064e261d9f', '74c0c614ec4416338a54a5002ce953142d181da958057b6a8c60875abf44e8bc', '2025-12-29 11:07:28.238+00', '2025-12-28 11:07:51.799028+00', '2025-12-28 11:07:30.83212+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('ac2d90e8-d1ad-4d69-bcca-71076ca16962', 'b35bdf91-07eb-4366-949d-5e6815d168ed', '03d6607c5338b1c24db73607e5992dc8edf487555da890eb06b9501680c8bde9', '2025-12-29 11:22:11.160009+00', NULL, '2025-12-28 10:08:44.406723+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('d29848a5-0d20-4ae7-8098-1cb031a604af', 'b35bdf91-07eb-4366-949d-5e6815d168ed', '8f52f1b087a315e04e93cffe69503307f2b8c126883d2a47e8416fa417e1e42f', '2025-12-29 11:22:11.160009+00', NULL, '2025-12-28 10:10:27.666773+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('c94e80f2-53a1-4cb5-888b-7af2671d48ae', 'b35bdf91-07eb-4366-949d-5e6815d168ed', 'fcc536dfe54081add3a2c254e0deedc998ae8578dc968d22fddd2c155ec9e5c7', '2025-12-29 11:22:11.160009+00', NULL, '2025-12-28 10:13:06.745325+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('85fa25cc-5fb2-4be3-8c4a-704aa94168e4', 'b35bdf91-07eb-4366-949d-5e6815d168ed', '6a179237128b2e0257a6cd2b5ad3060c34a47a3c234c7e2b0baea5c9e81b5c53', '2025-12-29 11:22:11.160009+00', NULL, '2025-12-28 10:18:24.500334+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('21e13aff-606c-4871-a1d3-4a3c3864fd64', 'b35bdf91-07eb-4366-949d-5e6815d168ed', 'd0420037cb898df2aa5ce331a404153c627d486a5652e07ab6d24cf767f2c304', '2025-12-29 11:22:11.160009+00', NULL, '2025-12-28 09:37:08.614702+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('8dd42c46-c9b6-48c5-b0b1-b2af29917d54', 'b35bdf91-07eb-4366-949d-5e6815d168ed', '5f688e63f8511a2d8a87831972f23e76c6c5a86239e7a2ad602bd677ee18fa97', '2025-12-29 11:22:11.160009+00', NULL, '2025-12-28 10:00:29.878117+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('9b7b9d6e-e602-4a74-b744-de28d4f6faf6', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'a3ba2bf708c41c503ab5a6107cb55becd9a3af898202ad8f6e549aa9b0ac72c7', '2025-12-28 08:37:35.285536+00', '2025-12-26 07:50:21.934631+00', '2025-12-26 07:49:32.520838+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('9efd5414-b76d-45bb-bd2f-2d740f824ae6', '33d48660-6e6a-4fb9-9fc9-628e3c1b7999', 'f059aa414e5a2c6b11c36249302a6b72198985f74eec9499d1606d0747007307', '2025-12-28 08:37:35.285536+00', '2025-12-26 12:13:22.457258+00', '2025-12-26 12:12:44.35884+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('4e623512-74c6-459f-b695-82fb7d631097', '2ea7f2d2-b972-483e-837e-e7c65031d382', '67f366de0840a344766fc914264d98ccb369758eb021cf95c36fdd72ab03d7f9', '2025-12-28 08:37:35.285536+00', '2025-12-28 06:40:49.141563+00', '2025-12-28 06:40:23.18672+00');
INSERT INTO public.email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES ('4214f237-4df6-4d8e-9c51-4526ee0d7ff7', '650a96c4-15d9-4651-9250-921122efa9bc', '3f98bbcdcfe6cd0662f621dda3aebd613613dec892d1e283af7e65709ebcb55c', '2025-12-28 08:37:35.285536+00', '2025-12-28 09:33:26.582453+00', '2025-12-28 09:32:58.589025+00');

--
-- Data for Name: task_lists
--
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('9310e490-dd32-4cb9-9223-affd49bf54ae', '33d48660-6e6a-4fb9-9fc9-628e3c1b7999', 'My List', 0, '2025-12-26 12:12:44.052369+00', '2025-12-26 12:12:44.052369+00', true);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('1f7026eb-7a66-4f42-8237-c0c30bc2b8f8', '2ea7f2d2-b972-483e-837e-e7c65031d382', 'My List', 0, '2025-12-28 06:40:22.829463+00', '2025-12-28 06:40:22.829463+00', true);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('c03e43bf-09ab-489d-9a5a-06cd5e8114a3', '650a96c4-15d9-4651-9250-921122efa9bc', 'My List', 0, '2025-12-28 09:32:58.245855+00', '2025-12-28 09:32:58.245855+00', true);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('28969eeb-9f16-4ba9-bc8d-6b873705985b', 'b35bdf91-07eb-4366-949d-5e6815d168ed', 'My List', 0, '2025-12-28 09:37:08.234898+00', '2025-12-28 09:37:08.234898+00', true);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('b3c4b96b-39fe-4671-8235-32b31417d7d4', '93729248-80f8-4f6f-9f36-e3064e261d9f', 'My List', 0, '2025-12-28 11:07:30.572436+00', '2025-12-28 11:07:30.572436+00', true);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('a163e7e4-818c-498f-b999-c805bb19ccbd', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'Siva', 1, '2026-01-04 11:26:43.908162+00', '2026-01-25 19:49:59.489052+00', false);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('7fff40f5-0317-4d42-9d30-7e73dbe68526', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'My List - 1', 0, '2025-12-26 07:49:32.238655+00', '2026-01-25 19:49:59.489052+00', true);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('e39526b8-309d-4fec-8340-e543d34eb943', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'rtherheh', 3, '2026-01-23 07:08:04.125772+00', '2026-01-25 19:49:59.489052+00', false);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('28b8f8c9-962b-4aaa-aa66-71a48155ad43', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'vadedvasv', 2, '2026-01-25 14:52:18.833516+00', '2026-01-25 19:49:59.489052+00', false);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('b9f0ad28-28a1-4d0b-9369-aa902afbf7d0', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'rhdrth', 4, '2026-01-25 15:35:26.466331+00', '2026-01-25 19:49:59.489052+00', false);
INSERT INTO public.task_lists (id, user_id, name, sort_order, created_at, updated_at, is_default) VALUES ('01f5ac70-2f24-4019-be3e-cffaeee45725', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'rrhrhs', 5, '2026-01-25 19:49:27.158474+00', '2026-01-25 19:49:59.489052+00', false);

--
-- Data for Name: tasks
--
INSERT INTO public.tasks (id, user_id, list_id, parent_task_id, title, description, is_completed, is_starred, due_date, sort_order, deleted_at, completed_at, created_at, updated_at) VALUES ('b63f0e6d-8367-4b16-a8c9-5951a6ab0d2e', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', '7fff40f5-0317-4d42-9d30-7e73dbe68526', '7785b42e-e7c4-45f0-9e72-9544eb19a70a', 'sgdfgrgarga', NULL, false, false, NULL, 0, NULL, NULL, '2026-01-25 20:00:54.758352+00', '2026-01-25 20:06:03.25428+00');
INSERT INTO public.tasks (id, user_id, list_id, parent_task_id, title, description, is_completed, is_starred, due_date, sort_order, deleted_at, completed_at, created_at, updated_at) VALUES ('5a8ad0cd-0446-453b-a67e-e0f3ee102d0a', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', '7fff40f5-0317-4d42-9d30-7e73dbe68526', '7785b42e-e7c4-45f0-9e72-9544eb19a70a', 'gergaerga', NULL, false, false, NULL, 1, NULL, NULL, '2026-01-25 20:01:01.725677+00', '2026-01-25 20:06:03.25428+00');
INSERT INTO public.tasks (id, user_id, list_id, parent_task_id, title, description, is_completed, is_starred, due_date, sort_order, deleted_at, completed_at, created_at, updated_at) VALUES ('fc6bc4b4-506f-416a-8346-3eebbfc4c433', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', '7fff40f5-0317-4d42-9d30-7e73dbe68526', NULL, 'ewfawggw', NULL, false, false, NULL, 2, NULL, NULL, '2026-01-25 19:48:02.838377+00', '2026-01-25 20:09:51.885972+00');
INSERT INTO public.tasks (id, user_id, list_id, parent_task_id, title, description, is_completed, is_starred, due_date, sort_order, deleted_at, completed_at, created_at, updated_at) VALUES ('7785b42e-e7c4-45f0-9e72-9544eb19a70a', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', '7fff40f5-0317-4d42-9d30-7e73dbe68526', NULL, 'rergser', NULL, false, false, NULL, 3, NULL, NULL, '2026-01-25 19:48:06.443427+00', '2026-01-25 20:09:51.885972+00');
INSERT INTO public.tasks (id, user_id, list_id, parent_task_id, title, description, is_completed, is_starred, due_date, sort_order, deleted_at, completed_at, created_at, updated_at) VALUES ('535d38f4-8376-4fd8-ae5b-bcda52968e9c', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', '7fff40f5-0317-4d42-9d30-7e73dbe68526', NULL, 'dgdgrg', 'rgsergaerg', false, false, NULL, 1, NULL, NULL, '2026-01-25 20:00:42.921855+00', '2026-01-25 20:09:51.885972+00');
INSERT INTO public.tasks (id, user_id, list_id, parent_task_id, title, description, is_completed, is_starred, due_date, sort_order, deleted_at, completed_at, created_at, updated_at) VALUES ('f1128d6f-9174-4642-a0b3-45c826e83910', '8251e8fc-fd04-4415-b8c0-bbcdde94003d', '7fff40f5-0317-4d42-9d30-7e73dbe68526', NULL, 'aergaerg', 'aergargawrwg', false, false, NULL, 0, NULL, NULL, '2026-01-25 20:00:45.749028+00', '2026-01-25 20:09:51.885972+00');

--
-- Data for Name: users
--
INSERT INTO public.users (id, email, password_hash, name, is_email_verified, created_at, updated_at, google_id) VALUES ('8251e8fc-fd04-4415-b8c0-bbcdde94003d', 'sivacr1312@gmail.com', '$2b$10$mRehGYbgo1GejGQGqdzSHeUaoZTJFuHE0cYEW5QEMTPwmnNiY92oW', 'User', true, '2025-12-26 07:49:31.954769+00', '2025-12-26 07:49:31.954769+00', NULL);
INSERT INTO public.users (id, email, password_hash, name, is_email_verified, created_at, updated_at, google_id) VALUES ('33d48660-6e6a-4fb9-9fc9-628e3c1b7999', 'subvalpavsid@gmail.com', '$2b$10$Z.1yWGo/AaP6YKVGOX.c3OW7xgpHlNWGVWUeC8iWFGz.r1ugOtaLO', 'SIVA', true, '2025-12-26 12:12:43.618825+00', '2025-12-26 12:12:43.618825+00', NULL);
INSERT INTO public.users (id, email, password_hash, name, is_email_verified, created_at, updated_at, google_id) VALUES ('2ea7f2d2-b972-483e-837e-e7c65031d382', 'netime40@gmail.com', '$2b$10$nz6PnOnAze3LNdo4iL6wf.xt.KRVB/HXvYjxglvFuZKMmICtBBtyC', 'siva', true, '2025-12-28 06:40:22.494801+00', '2025-12-28 06:40:22.494801+00', NULL);
INSERT INTO public.users (id, email, password_hash, name, is_email_verified, created_at, updated_at, google_id) VALUES ('650a96c4-15d9-4651-9250-921122efa9bc', 'siva2025mov@gmail.com', '$2b$10$1szxCyYiLxOPvaTr8wAiz.w/HEkE6vJOMTU9Ka0hAPTOVcTTDfUde', 'Sidd', true, '2025-12-28 09:32:57.915499+00', '2025-12-28 09:32:57.915499+00', NULL);
INSERT INTO public.users (id, email, password_hash, name, is_email_verified, created_at, updated_at, google_id) VALUES ('b35bdf91-07eb-4366-949d-5e6815d168ed', 's1amsivasankar@gmail.com', '$2b$10$OByVISkRMUjvJ0finQRsbezdUnvewrFUFoYe0pB7uBgXiJVSp6ZoW', 'Sss', true, '2025-12-28 09:37:07.858338+00', '2025-12-28 09:37:07.858338+00', NULL);
INSERT INTO public.users (id, email, password_hash, name, is_email_verified, created_at, updated_at, google_id) VALUES ('93729248-80f8-4f6f-9f36-e3064e261d9f', '123s@gmail.com', '$2b$10$XMJXVT3I1xE9vc9HOn61ieUMtsOq3X92GkgGdEXuyPjwNhPPMtWdC', 'rgjrg', true, '2025-12-28 11:07:30.307099+00', '2025-12-28 11:07:30.307099+00', NULL);

--
-- Constraints (Primary Keys & Foreign Keys)
--
ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.task_lists
    ADD CONSTRAINT task_lists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_lists
    ADD CONSTRAINT task_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.task_lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--