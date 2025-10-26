import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // These are public routes
  const publicRoutes = ['/sign-in', '/sign-up'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // To prevent infinite redirects, we need to check if the user is authenticated.
  // This is a placeholder for actual authentication logic.
  // In a real Firebase app, you'd use Admin SDK on the backend or a session cookie.
  // Since we are client-side only for this example, this middleware is simplified.
  // Let's assume for now that if someone tries to access a non-public route,
  // we redirect them to sign-in.
  
  // A more robust client-side approach would involve a session cookie checked here.
  // For now, client-side routing in `src/app/page.tsx` will handle the redirect based on auth state.
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
