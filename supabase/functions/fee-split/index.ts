// Deno std/server import kept; preview environment ignores supabase/functions at runtime
import { createClient } from '@supabase/supabase-js'

serve(async (req:any) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) return new Response('Missing env', { status:500 })
  const sb = createClient(supabaseUrl, supabaseKey)
  try {
    const { booking_id } = await req.json()
    // Fetch booking
    const { data: booking } = await sb.from('bookings').select('*').eq('id', booking_id).single()
    if (!booking) return new Response('booking not found', { status:404 })
    // Fetch instructor wallet
    const { data: instructorWallet } = await sb.from('wallets').select('*').eq('user_id', booking.instructor_id).single()
    const { data: platformSetting } = await sb.from('platform_settings').select('*').eq('key','platform_fee_percent').single()
    const feePercent = Number(platformSetting?.value || 10)/100
    const amount = Number(booking.instructor_rate)
    const fee = Math.round(amount * feePercent)
    const payout = amount - fee
    // perform inserts: payout to instructor, fee_split to platform (admin wallets assumed single admin)
    const { data: platformAdmin } = await sb.from('admins').select('user_id').limit(1).single()
    const { data: platformWallet } = await sb.from('wallets').select('*').eq('user_id', platformAdmin.user_id).single()
    // create instructor transaction
    const instrNewBal = Number(instructorWallet.balance) + payout
    await sb.from('transactions').insert([{ wallet_id: instructorWallet.id, kind: 'payout', amount: payout, balance_after: instrNewBal, related_booking: booking_id }])
    await sb.from('wallets').update({ balance: instrNewBal }).eq('id', instructorWallet.id)
    // create platform transaction
    const platNewBal = Number(platformWallet.balance) + fee
    await sb.from('transactions').insert([{ wallet_id: platformWallet.id, kind: 'fee_split', amount: fee, balance_after: platNewBal, related_booking: booking_id }])
    await sb.from('wallets').update({ balance: platNewBal }).eq('id', platformWallet.id)
    // mark booking as completed
    await sb.from('bookings').update({ status: 'completed' }).eq('id', booking_id)
    return new Response('ok')
  } catch(e){
    return new Response(String(e), { status: 500 })
  }
})
