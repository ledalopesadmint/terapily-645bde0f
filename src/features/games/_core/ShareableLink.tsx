/**
 * Componente pra exibir/copiar o magic link de uma sessão de jogo.
 * STUB Semana 1 — implementação real em S3-S4.
 *
 * REGRA: token cru NUNCA armazenado. Banco guarda só `shareable_token_hash`.
 * O token cru aparece UMA vez aqui, depois desaparece.
 */

interface ShareableLinkProps {
  sessionId: string;
}

export function ShareableLink({ sessionId }: ShareableLinkProps) {
  // TODO Semana 3-4: gerar token, calcular hash, salvar no banco, retornar link
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      Em breve · Semana 3 — link compartilhável pra sessão {sessionId}.
    </div>
  );
}
