export interface AuthUser {
  username: string;
  nombre?: string;
  cargo?: string;
}

export function getUserDisplayName(user?: AuthUser | { username: string; nombre?: string; cargo?: string } | null): string {
  if (!user) return 'Recepción';
  if (user.nombre && user.nombre.trim()) return user.nombre.trim();
  const uname = (user.username || '').trim();
  if (uname.toUpperCase() === 'SYSDBA') return 'Administrador';
  return uname || 'Recepción';
}

export function getUserCargo(user?: AuthUser | { username: string; nombre?: string; cargo?: string } | null): string {
  if (!user) return 'Recepción';
  if (user.cargo && user.cargo.trim()) return user.cargo.trim();
  const uname = (user.username || '').trim();
  if (uname.toUpperCase() === 'SYSDBA') return 'Administrador';
  return 'Recepción';
}
