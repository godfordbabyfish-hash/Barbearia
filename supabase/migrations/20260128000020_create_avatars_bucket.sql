-- Criar bucket para avatares de usuários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket avatars
DROP POLICY IF EXISTS "Todos podem ver avatares" ON storage.objects;
CREATE POLICY "Todos podem ver avatares"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuários podem fazer upload de seus próprios avatares" ON storage.objects;
CREATE POLICY "Usuários podem fazer upload de seus próprios avatares"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios avatares" ON storage.objects;
CREATE POLICY "Usuários podem atualizar seus próprios avatares"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Usuários podem deletar seus próprios avatares" ON storage.objects;
CREATE POLICY "Usuários podem deletar seus próprios avatares"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
