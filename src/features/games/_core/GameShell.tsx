/**
 * Shell visual compartilhado pros jogos.
 * STUB Semana 1 — implementação real em S3.
 */

interface GameShellProps {
  children: React.ReactNode;
  title: string;
  onExit?: () => void;
}

export function GameShell({ children, title, onExit }: GameShellProps) {
  // TODO Semana 3: header com progresso, botão de pausa, accessibility, etc.
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl">{title}</h1>
          {onExit && (
            <button onClick={onExit} className="text-sm text-muted-foreground hover:text-foreground">
              Sair
            </button>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
