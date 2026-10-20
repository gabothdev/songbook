import prisma from '../db.js';

/**
 * Resuelve el usuario activo a partir de su ID o Email.
 * Si no se encuentra o no se provee, retorna el usuario de desarrollo por defecto o el primero de la base de datos.
 */
export async function getResolvedUser(identifier?: string | null) {
  if (identifier) {
    const u = await prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { email: identifier }
        ]
      }
    });
    if (u) return u;
  }

  let defaultUser = await prisma.user.findUnique({ where: { email: 'gabothdev@gmail.com' } });
  if (!defaultUser) {
    defaultUser = await prisma.user.findFirst();
  }
  return defaultUser;
}
