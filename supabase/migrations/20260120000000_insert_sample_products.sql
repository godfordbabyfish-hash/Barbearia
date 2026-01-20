-- Insert sample products for the shop
-- This migration adds a variety of barbershop products with images and descriptions
-- Images are set to NULL so admins can upload their own product images via the admin panel

INSERT INTO public.products (name, description, price, image_url, category, stock, visible, order_index) VALUES

-- Pomadas e Ceras
('Pomada Modeladora Premium', 'Pomada de alta fixação com acabamento brilhante. Ideal para cortes clássicos e pompadours. Contém cera de abelha e óleos naturais para brilho duradouro sem resíduos.', 45.90, NULL, 'Pomadas e Ceras', 50, true, 1),

('Cera Modeladora Ultra Hold', 'Cera com fixação extrema para estilos rebeldes e desfiados. Resistente à água e ao vento. Fórmula vegana com ingredientes naturais.', 52.00, NULL, 'Pomadas e Ceras', 35, true, 2),

('Gel Fixador Profissional', 'Gel transparente de alta performance. Garante controle total dos fios com brilho natural. Perfeito para cortes modernos e texturizados.', 38.50, NULL, 'Pomadas e Ceras', 42, true, 3),

('Pomada Matte Natural', 'Acabamento matte e natural para um look discreto e elegante. Fixação média-alta sem brilho. Fórmula à base de argila branca.', 48.00, NULL, 'Pomadas e Ceras', 28, true, 4),

-- Shampoos e Condicionadores
('Shampoo Fortificante Masculino', 'Shampoo com proteínas e queratina para fortalecer os fios. Limpa profundamente sem ressecar. Aromas cítricos e mentolados revigorantes.', 32.90, NULL, 'Cuidados Capilares', 60, true, 5),

('Condicionador Reparador 2 em 1', 'Condicionador de uso diário com ação reparadora. Hidrata e nutre os fios, facilitando o penteado. Sem enxágue necessário.', 35.00, NULL, 'Cuidados Capilares', 55, true, 6),

('Shampoo Anticaspa Premium', 'Tratamento anticaspa com zinco e alcatrão. Controla a oleosidade e combate a descamação. Fórmula suave para uso frequente.', 39.90, NULL, 'Cuidados Capilares', 40, true, 7),

('Tratamento Capilar Hidratante', 'Máscara nutritiva com óleo de argan e vitamina E. Restaura fios danificados e devolve maciez e brilho. Uso semanal recomendado.', 58.00, NULL, 'Cuidados Capilares', 25, true, 8),

-- Pós-Barba e Cuidados com Barba
('Loção Pós-Barba Hidratante', 'Loção refrescante com aloe vera e mentol. Acelera a cicatrização, previne irritações e hidrata profundamente. Sensação de frescor imediato.', 42.50, NULL, 'Cuidados com Barba', 45, true, 9),

('Óleo para Barba Premium', 'Óleo nutritivo com vitaminas A, D e E. Amacia e hidrata pelos e pele. Reduz coceiras e dá brilho natural. Frasco de 30ml com conta-gotas.', 55.00, NULL, 'Cuidados com Barba', 38, true, 10),

('Balm Hidratante para Barba', 'Bálsamo sólido com manteiga de karité e óleo de jojoba. Condiciona, modela e nutre a barba. Aromas masculinos marcantes.', 49.90, NULL, 'Cuidados com Barba', 32, true, 11),

('Shampoo para Barba Especial', 'Limpa profundamente sem ressecar. Remove partículas e mantém os pelos macios e sedosos. Fórmula específica para barba e bigode.', 36.00, NULL, 'Cuidados com Barba', 48, true, 12),

('Cera Modeladora para Bigode', 'Cera específica para modelar e dar formato ao bigode. Fixação forte com acabamento natural. Aplicação fácil com os dedos.', 28.90, NULL, 'Cuidados com Barba', 50, true, 13),

-- Acessórios e Ferramentas
('Kit Navalhas de Barbear Clássicas', 'Conjunto de 5 navalhas descartáveis premium. Lâminas duplas ultra afiadas para um barbear perfeito. Ideal para uso profissional ou doméstico.', 35.00, NULL, 'Acessórios', 70, true, 14),

('Escova para Barba Premium', 'Escova de cerda natural importada. Distribui óleos uniformemente, desembaraça e estimula a pele. Cabo de madeira ergonômico.', 65.00, NULL, 'Acessórios', 30, true, 15),

('Pente para Barba em Madeira', 'Pente artesanal em madeira de bambu. Espaçamento perfeito entre os dentes. Suave e resistente. Peça única e sustentável.', 28.00, NULL, 'Acessórios', 55, true, 16),

('Tesoura Profissional para Barba', 'Tesoura de alta precisão com lâminas de aço inox. Design anatômico e corte preciso. Ideal para manter a barba sempre no ponto.', 85.00, NULL, 'Acessórios', 20, true, 17),

('Navalha Straight Razor Clássica', 'Navalha clássica de barbeiro profissional. Lâmina de aço carbono afiada manualmente. Cabo em madeira nobre. Peça de colecionador.', 180.00, NULL, 'Acessórios', 10, true, 18),

('Espelho com Iluminação LED', 'Espelho profissional com iluminação LED ajustável. Perfeito para barbear e cuidados pessoais. Base anti-derrapante. Design moderno.', 125.00, NULL, 'Acessórios', 15, true, 19),

-- Perfumes e Fragrâncias
('Colônia Masculina Premium', 'Fragrância amadeirada e sofisticada. Notas de madeira, tabaco e especiarias. Fixação duradoura. Frasco de 100ml elegante.', 95.00, NULL, 'Perfumaria', 35, true, 20),

('Desodorante Roll-On Natural', 'Desodorante sem álcool e sem alumínio. Proteção de 48h com ingredientes naturais. Aromas frescos e masculinos.', 24.90, NULL, 'Cuidados Pessoais', 80, true, 21),

('Água de Colônia Revigorante', 'Refrescante e energizante. Notas cítricas e mentoladas. Ideal para o dia a dia. Perfume discreto e marcante.', 45.00, NULL, 'Perfumaria', 50, true, 22),

-- Kits e Combos
('Kit Completo para Barba', 'Kit premium com óleo, balm, escova e pente para barba. Tudo que você precisa para cuidar da sua barba com qualidade profissional.', 149.90, NULL, 'Kits', 25, true, 23),

('Kit Cuidados Diários', 'Combo essencial com shampoo, condicionador e pomada. Cuidados completos para o dia a dia. Produtos testados e aprovados.', 110.00, NULL, 'Kits', 30, true, 24),

('Kit Premium Completo', 'Kit luxuoso com todos os produtos premium: pomadas, óleos, cremes e acessórios. Presente perfeito ou investimento em qualidade.', 299.90, NULL, 'Kits', 12, true, 25)

ON CONFLICT DO NOTHING;
