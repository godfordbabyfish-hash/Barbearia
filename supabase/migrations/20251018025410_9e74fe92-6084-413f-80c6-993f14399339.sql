-- Criar bucket para imagens do site
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Políticas para o bucket site-images
CREATE POLICY "Todos podem ver imagens do site"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-images');

CREATE POLICY "Admin pode fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-images');

CREATE POLICY "Admin pode atualizar imagens"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-images');

CREATE POLICY "Admin pode deletar imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-images');