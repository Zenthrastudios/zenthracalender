-- Public image uploads (event banners, instructor avatars, testimonial avatars)

-- Create bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do update set public = true;
