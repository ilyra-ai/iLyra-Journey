'use client';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  firstName: string;
  onUploadSuccess: (newUrl: string) => void;
}

export function AvatarUploader({
  currentAvatarUrl,
  firstName,
  onUploadSuccess,
}: AvatarUploaderProps) {
  const { db, session } = useAuth();
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!session?.user) return;
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error('Arquivo muito grande.', {
        description: 'O limite é de 5MB.',
      });
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    // Define o caminho como user_id/nome_aleatorio.ext
    const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

    // 1. Upload do arquivo para o storage local servido pela aplicação
    const { error: uploadError } = await db.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      setUploading(false);
      toast.error('Erro ao enviar imagem.', {
        description: uploadError.message,
      });
      return;
    }

    // 2. Get public URL
    const { data: publicUrlData } = db.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 3. Update profile table with the new URL
    const { error: updateError } = await db
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', session.user.id);

    setUploading(false);

    if (updateError) {
      toast.error('Erro ao salvar URL do perfil.', {
        description: updateError.message,
      });
    } else {
      toast.success('Avatar atualizado com sucesso!');
      onUploadSuccess(publicUrl);
    }
  };

  const initial = firstName.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        id="avatar-upload"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        disabled={uploading}
      />

      {/* Botão de verdade (tarefa 61): antes uma `div` clicável, fora do
          alcance do teclado. A foto é decorativa; o nome do botão explica. */}
      <button
        type="button"
        className="group relative cursor-pointer rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-progress"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label={`Trocar a foto de ${firstName || 'perfil'}`}
      >
        <Avatar className="size-28 border border-border sm:size-32">
          <AvatarImage src={currentAvatarUrl || undefined} alt="" />
          <AvatarFallback className="bg-sidebar-accent font-display text-5xl font-semibold text-primary">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            ) : (
              initial
            )}
          </AvatarFallback>
        </Avatar>

        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-full bg-overlay/60 opacity-0 transition-opacity duration-200',
            !uploading &&
              'group-hover:opacity-100 group-focus-visible:opacity-100'
          )}
          aria-hidden="true"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-white" />
          ) : (
            <Camera className="size-6 text-white" />
          )}
        </div>
      </button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Enviando...' : 'Atualizar avatar'}
      </Button>
    </div>
  );
}
