import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartItem {
  product_id: string
  seller_id: string
  quantity: number
  unit_price: number
  name: string
}

interface ShippingAddress {
  first_name: string
  last_name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { items, shipping_address, total_amount, currency = 'NGN' }: {
      items: CartItem[]
      shipping_address: ShippingAddress
      total_amount: number
      currency?: string
    } = await req.json()

    if (!items?.length || !shipping_address || !total_amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields: items, shipping_address, total_amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate all products exist, are approved, and have sufficient stock
    const productIds = items.map(i => i.product_id)
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, title, stock_quantity, is_approved, is_available, price, seller_id')
      .in('id', productIds)

    if (productError) throw productError

    for (const item of items) {
      const product = products?.find(p => p.id === item.product_id)
      if (!product) {
        return new Response(JSON.stringify({ error: `Product not found: ${item.product_id}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!product.is_approved || !product.is_available) {
        return new Response(JSON.stringify({ error: `Product is not available: ${product.title}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (product.stock_quantity < item.quantity) {
        return new Response(JSON.stringify({ error: `Insufficient stock for: ${product.title}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Generate Paystack reference
    const timestamp = Date.now()
    const paystackReference = `ORDER_${user.id.replace(/-/g, '').slice(0, 8)}_${timestamp}`

    // Create the order (pending — stock decrements after payment confirmed)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        buyer_id: user.id,
        status: 'pending',
        total_amount,
        currency,
        shipping_address,
        paystack_reference: paystackReference,
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      seller_id: item.seller_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback order if items fail
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    console.log(`Order created: ${order.id} for user ${user.id}, ref: ${paystackReference}`)

    return new Response(
      JSON.stringify({
        status: true,
        order_id: order.id,
        paystack_reference: paystackReference,
        total_amount,
        currency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('marketplace-create-order error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create order' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
