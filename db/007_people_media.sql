-- Player headshots and club crests, uploaded in the admin and stored in media.
-- A headshot of a player under 18 is shown in public only with a guardian's consent date:
-- public pages read it through public_photo(), whatever screen or import set it.
begin;

alter table players drop constraint if exists players_photo_url_check;
alter table players add constraint players_photo_url_check check (photo_url is null or photo_url ~ '^/(img|media)/');
alter table clubs drop constraint if exists clubs_crest_url_check;
alter table clubs add constraint clubs_crest_url_check check (crest_url is null or crest_url ~ '^/(img|media)/');

-- The headshot the public may see: a player known to be 18 or over, or anyone with a
-- guardian's consent date. With no date of birth and no consent, none.
create or replace function public_photo(p players) returns text language sql stable as $$
  select case
           when p.photo_url is null then null
           when p.guardian_consent_on is not null then p.photo_url
           when p.date_of_birth is not null and p.date_of_birth <= current_date - interval '18 years' then p.photo_url
           else null
         end
$$;

commit;
