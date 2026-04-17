# 🔧 Verificar e Corrigir Disponibilidade do Barbeiro

## ⚠️ Problema Identificado

Erros 400 e 404 ao tentar carregar/atualizar disponibilidade do barbeiro:
- `400 Bad Request` ao buscar `availability` da tabela `barbers`
- `400 Bad Request` ao atualizar `availability`
- `404 Not Found` ao buscar `barber_breaks`

---

## ✅ Possíveis Causas

### Causa 1: Migrations não executadas
- A coluna `availability` pode não existir na tabela `barbers`
- A tabela `barber_breaks` pode não existir

### Causa 2: Problemas de RLS (Row Level Security)
- Políticas podem estar bloqueando o acesso

---

## 🚀 Solução: Verificar e Executar Migrations

### 1. Verificar se a coluna `availability` existe

**Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/editor

**Execute no SQL Editor:**
```sql
-- Verificar se a coluna existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'barbers' 
AND column_name = 'availability';
```

**Se não existir**, execute:
```sql
-- Adicionar coluna availability
ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{
  "monday": { "open": "09:00", "close": "20:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "20:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "20:00", "closed": false },
  "thursday": { "open": "09:00", "close": "20:00", "closed": false },
  "friday": { "open": "09:00", "close": "20:00", "closed": false },
  "saturday": { "open": "09:00", "close": "18:00", "closed": false },
  "sunday": { "open": "09:00", "close": "18:00", "closed": true }
}'::jsonb;
```

---

### 2. Verificar se a tabela `barber_breaks` existe

**Execute no SQL Editor:**
```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'barber_breaks';
```

**Se não existir**, execute a migration completa:
```sql
-- Criar tabela barber_breaks
CREATE TABLE IF NOT EXISTS public.barber_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_end_after_start CHECK (end_time > start_time),
  CONSTRAINT unique_barber_date_start UNIQUE (barber_id, date, start_time)
);

-- Habilitar RLS
ALTER TABLE public.barber_breaks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Barbers can view their own breaks"
  ON public.barber_breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can insert their own breaks"
  ON public.barber_breaks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can update their own breaks"
  ON public.barber_breaks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can delete their own breaks"
  ON public.barber_breaks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all breaks"
  ON public.barber_breaks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Everyone can view breaks for booking"
  ON public.barber_breaks FOR SELECT
  USING (true);
```

---

### 3. Verificar Políticas RLS para `barbers`

**Execute:**
```sql
-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'barbers';
```

**Garantir que existe política para barbeiros atualizarem seus próprios dados:**
```sql
-- Se não existir, criar política
CREATE POLICY "Barbers can update their own data"
  ON public.barbers FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### 4. Testar após correções

1. **Recarregue a página** do barbeiro
2. **Abra o console** (F12)
3. **Tente alterar a disponibilidade**
4. **Verifique os logs** - não deve mais aparecer erro 400

---

## 📋 Checklist

- [ ] Coluna `availability` existe na tabela `barbers`
- [ ] Tabela `barber_breaks` existe
- [ ] Políticas RLS estão configuradas corretamente
- [ ] Teste de alteração de disponibilidade funciona
- [ ] Logs não mostram mais erros 400/404

---

**Execute as verificações acima e me avise o resultado! 🚀**
