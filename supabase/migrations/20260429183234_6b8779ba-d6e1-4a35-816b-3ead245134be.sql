-- enforce_patient_limit() só faz sentido como BEFORE INSERT trigger.
-- Revoga EXECUTE direto pra anon/authenticated — defesa em profundidade
-- contra chamada como RPC.
revoke execute on function public.enforce_patient_limit() from public;
revoke execute on function public.enforce_patient_limit() from anon;
revoke execute on function public.enforce_patient_limit() from authenticated;
