import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { ComicSlideReader } from '@/components/comic-slides/comic-slide-reader'
export const dynamic='force-dynamic'
export default async function SlidePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const {user,profile}=await getCurrentUser();if(!user)redirect(`/student/login?next=${encodeURIComponent(`/student/slides/${id}`)}`);if(profile?.role!=='student')redirect('/');return <ComicSlideReader materialId={id}/>}
