-- Insert new services from the user's list
-- This migration adds the new service options with appropriate durations

INSERT INTO public.services (title, description, price, icon, duration, visible, order_index) VALUES

-- Serviços básicos
('Corte', 'Corte de cabelo moderno e personalizado para seu estilo. Técnicas profissionais com acabamento impecável.', 50.00, 'Scissors', 30, true, 1),

('Barba', 'Tratamento completo de barba com navalha, toalha quente e produtos premium. Acabamento profissional.', 35.00, 'Wind', 30, true, 2),

('Limpeza de pele', 'Limpeza facial profunda com produtos específicos para tratamento e hidratação da pele.', 45.00, 'Sparkles', 45, true, 3),

-- Serviços combinados
('Corte + Barba (Sobrancelha gratuito e opcional)', 'Combo completo: corte de cabelo e tratamento de barba. Sobrancelha incluída gratuitamente e opcional.', 75.00, 'Scissors', 60, true, 4),

('Corte + Sobrancelha', 'Corte de cabelo combinado com design e ajuste de sobrancelha para um visual harmonioso.', 60.00, 'Scissors', 40, true, 5),

('Barba + pezinho', 'Tratamento de barba completo incluindo acabamento do pezinho (contorno e definição).', 45.00, 'Wind', 35, true, 6),

('Barba + Sobrancelha', 'Tratamento de barba combinado com design e ajuste de sobrancelha para um visual completo.', 50.00, 'Wind', 40, true, 7),

('Barba + Pezinho + Sobrancelha', 'Combo completo: tratamento de barba, acabamento do pezinho e design de sobrancelha. Visual impecável.', 60.00, 'Wind', 45, true, 8)

ON CONFLICT DO NOTHING;
