'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buscarJson } from '@/lib/http/transporte';

export function CriarUsuario({ aoCriar }: { aoCriar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (!ocupado) {
          setAberto(valor);
          setErro(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Novo usuário</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar usuário</DialogTitle>
          <DialogDescription>
            A conta começa no plano Free. A pessoa completa o perfil e os
            consentimentos no primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (ocupado) return;
            const form = event.currentTarget;
            const campos = new FormData(form);
            setOcupado(true);
            setErro(null);
            const resposta = await buscarJson('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(Object.fromEntries(campos)),
            });
            setOcupado(false);
            if (!resposta.ok) {
              setErro(resposta.falha.message);
              return;
            }
            form.reset();
            setAberto(false);
            toast.success('Usuário cadastrado no plano Free.');
            aoCriar();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="novo-nome">Nome</Label>
            <Input
              id="novo-nome"
              name="firstName"
              autoComplete="off"
              required
              maxLength={120}
              disabled={ocupado}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="novo-sobrenome">Sobrenome</Label>
            <Input
              id="novo-sobrenome"
              name="lastName"
              autoComplete="off"
              maxLength={120}
              disabled={ocupado}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="novo-email">E-mail</Label>
            <Input
              id="novo-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={255}
              disabled={ocupado}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Senha inicial</Label>
            <Input
              id="nova-senha"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
              disabled={ocupado}
              aria-describedby="nova-senha-ajuda"
            />
            <p id="nova-senha-ajuda" className="text-xs text-muted-foreground">
              Use de 12 a 72 caracteres. Combine a entrega da senha diretamente
              com a pessoa; o sistema não a envia por e-mail.
            </p>
          </div>
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" disabled={ocupado} className="w-full">
            {ocupado ? 'Cadastrando…' : 'Cadastrar no Free'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
