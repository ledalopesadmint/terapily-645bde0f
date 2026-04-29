-- S2: minimização de PHI no cadastro de pacientes.
-- Removemos data de nascimento e observações iniciais — não eram usadas
-- por nenhuma feature do roadmap e contradiziam o posicionamento
-- "Terapily não é prontuário, convive com o EHR existente".
-- Drop direto (sem migração de dados): colunas estavam vazias até hoje
-- porque a feature foi criada nesta mesma sessão.

ALTER TABLE public.patients
  DROP COLUMN IF EXISTS date_of_birth_encrypted,
  DROP COLUMN IF EXISTS intake_notes_encrypted;