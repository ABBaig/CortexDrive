// Deno std/server import kept; preview environment ignores supabase/functions at runtime
import { createClient } from '@supabase/supabase-js'

serve(async (req:any) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) return new Response('Missing env', { status:500 })
  const sb = createClient(supabaseUrl, supabaseKey)
  try {
    // find bookings that are booked and slot_end + 30 minutes < now()
    const { data: bookable } = await sb.rpc('no_show_candidates')
    if (!bookable || bookable.length===0) return new Response('none', { status:200 })
    for (const b of bookable) {
      // refund to learner wallet
      const { data: learnerWallet } = await sb.from('wallets').select('*').eq('user_id', b.learner_id).single()
      const amount = Number(b.instructor_rate)
      const newBal = Number(learnerWallet.balance) + amount
      await sb.from('transactions').insert([{ wallet_id: learnerWallet.id, kind: 'refund', amount, balance_after: newBal, related_booking: b.id }])
      await sb.from('wallets').update({ balance: newBal }).eq('id', learnerWallet.id)
      await sb.from('bookings').update({ status: 'refunded' }).eq('id', b.id)
    }
    return new Response('ok')
  } catch(e){
    return new Response(String(e), { status: 500 })
  }
})
