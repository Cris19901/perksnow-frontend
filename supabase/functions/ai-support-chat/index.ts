import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLAUDE_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SYSTEM_PROMPT = `You are LavLay's friendly support assistant. LavLay is a Nigerian social media platform where users earn points by engaging with content, and can withdraw earnings via bank transfer or mobile money.

Key facts:
- Users earn points by watching reels, reading posts, liking, and commenting
- Points convert to cash (10 points = ₦1)
- Withdrawal minimum: ₦1,000 (10,000 points)
- Subscription tiers: Free, Daily, Starter (15 days), Basic (30 days), Pro (30 days)
- Only paid subscribers can withdraw
- Points mature after 7 days (frozen until then)
- Referral system: earn points when friends sign up and make deposits (up to 10 deposits per referral)
- Supported withdrawal methods: bank transfer, MTN/Airtel/Glo/9mobile mobile money

Your job:
1. Answer user questions helpfully and concisely
2. If you cannot resolve the issue, collect their name, email, and a clear description of the problem
3. Once you have name + email + issue description, tell them a support ticket has been created and a human agent will follow up within 24 hours
4. Set escalated=true in your response JSON when you've collected all info needed for human handoff

Always respond in JSON format:
{
  "message": "your response text here",
  "escalated": false,
  "collected_info": {
    "name": null or string,
    "email": null or string,
    "category": "billing|account|withdrawal|points|technical|other",
    "description": null or string
  }
}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, ticket_id, user_id } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error('Claude API error:', err);
      throw new Error('AI service unavailable');
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text ?? '';

    // Parse the JSON response from Claude
    let parsed: {
      message: string;
      escalated: boolean;
      collected_info: {
        name: string | null;
        email: string | null;
        category: string;
        description: string | null;
      };
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      // If Claude didn't return valid JSON, wrap the text
      parsed = {
        message: rawText,
        escalated: false,
        collected_info: { name: null, email: null, category: 'general', description: null },
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // If escalated and we have enough info, create/update support ticket
    if (parsed.escalated && parsed.collected_info.name && parsed.collected_info.email) {
      const info = parsed.collected_info;

      let finalTicketId = ticket_id;

      if (!ticket_id) {
        // Create new ticket
        const { data: ticket, error: ticketErr } = await supabase
          .from('support_tickets')
          .insert({
            user_id: user_id ?? null,
            name: info.name,
            email: info.email,
            category: info.category ?? 'general',
            subject: info.description?.slice(0, 100) ?? 'Support request',
            status: 'open',
            priority: 'normal',
            ai_handled: true,
            escalated: true,
          })
          .select('id')
          .single();

        if (!ticketErr && ticket) {
          finalTicketId = ticket.id;

          // Save full conversation to ticket messages
          for (const msg of messages) {
            await supabase.from('support_messages').insert({
              ticket_id: finalTicketId,
              role: msg.role,
              content: msg.content,
            });
          }
        }
      } else {
        // Mark existing ticket as escalated
        await supabase
          .from('support_tickets')
          .update({ escalated: true, status: 'open' })
          .eq('id', ticket_id);
      }

      return new Response(
        JSON.stringify({ ...parsed, ticket_id: finalTicketId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ...parsed, ticket_id: ticket_id ?? null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('ai-support-chat error:', err);
    return new Response(
      JSON.stringify({
        message: "I'm sorry, I'm having trouble right now. Please email us at support@lavlay.com and we'll get back to you.",
        escalated: false,
        ticket_id: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
