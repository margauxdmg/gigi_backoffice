'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const password = formData.get('password') as string
  
  if (password === process.env.NEXT_PUBLIC_ADMIN_PASS) {
    cookies().set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
    redirect('/dashboard/ops')
  } else {
    return { error: 'Invalid password' }
  }
}

export async function logout() {
  cookies().delete('admin_session')
  redirect('/login')
}

