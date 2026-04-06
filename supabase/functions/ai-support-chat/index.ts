import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY         = Deno.env.get('GROQ_API_KEY') ?? '';
const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SYSTEM_PROMPT = `You are LavLay's friendly support assistant. LavLay is a Nigerian social media platform where users earn points by engaging with content, and can withdraw earnings via bank transfer or mobile money.

Key facts about LavLay:
- Users earn points by watching reels, reading posts, liking, and commenting
- Points convert to cash: 10 points = ₦1
- Withdrawal minimum: ₦1,000 (10,000 points)
- Points mature after 7 days (frozen until then)
- Subscription tiers: Free, Daily (1 day), Starter (15 days), Basic (30 days), Pro (30 days)
- Only paid subscribers (non-free) can withdraw
- Referral system: earn points when friends sign up and make deposits (up to 10 deposits per referred user)
- Withdrawal methods: bank transfer, MTN/Airtel/Glo/9mobile mobile money
- Support email: support@lavlay.com

Your behaviour:
1. Be friendly, concise, and helpful. Use simple English.
2. Answer questions directly using the facts above.
3. If you cannot resolve the issue (account-specific problems, bugs, payment disputes), collect the user's name, email, and a clear problem description, then set escalated=true.
4. Once you have all three (name + email + description), confirm: "I've created a support ticket. A human agent will follow up within 24 hours."
5. Never make up information. If unsure, say so and offer to escalate.

ALWAYS respond as valid JSON (no markdown, no code fences):
{
  "message": "your reply text here",
  "escalated": false,
  "collected_info": {
    "name": null,
    "email": null,
    "category": "billing|account|withdrawal|points|technical|other",
    "description": null
  }
}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Groq (primary, free) ---
async function callGroq(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 600,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// --- Claude Haiku (fallback, paid) ---
async function callClaude(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function getAIReply(messages: { role: string; content: string }[]): Promise<string> {
  // Try Groq first (free)
  if (GROQ_API_KEY) {
    try {
      return await callGroq(messages);
    } catch (e) {
      console.warn('Groq failed, falling back to Claude:', e);
    }
  }
  // Fall back to Claude
  if (ANTHROPIC_API_KEY) {
    return await callClaude(messages);
  }
  throw new Error('No AI provider configured');
}

function parseAIResponse(raw: string): {
  message: string;
  escalated: boolean;
  collected_info: { name: string | null; email: string | null; category: string; description: string | null };
} {
  // Strip markdown code fences if model wrapped the JSON
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { message: raw, escalated: false, collected_info: { name: null, email: null, category: 'general', description: null } };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, ticket_id, user_id } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if ticket is in human mode — don't call AI, just acknowledge
    if (ticket_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('mode')
        .eq('id', ticket_id)
        .single();

      if (ticket?.mode === 'human') {
        // Save user message but don't auto-reply
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'user') {
          await supabase.from('support_messages').insert({
            ticket_id,
            role: 'user',
            content: lastMsg.content,
          });
          await supabase.from('support_tickets').update({
            unread_agent_count: supabase.rpc('unread_agent_count', {}), // incremented by trigger
            last_message_at: new Date().toISOString(),
          }).eq('id', ticket_id);
        }
        return new Response(
          JSON.stringify({ message: null, human_mode: true, ticket_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const rawText = await getAIReply(messages);
    const parsed  = parseAIResponse(rawText);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let finalTicketId = ticket_id;

    if (parsed.escalated && parsed.collected_info.name && parsed.collected_info.email) {
      const info = parsed.collected_info;

      if (!ticket_id) {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .insert({
            user_id:     user_id ?? null,
            name:        info.name,
            email:       info.email,
            category:    info.category ?? 'general',
            subject:     info.description?.slice(0, 100) ?? 'Support request',
            status:      'open',
            priority:    'normal',
            mode:        'ai',
            escalated:   true,
            ai_handled:  true,
          })
          .select('id')
          .single();

        if (ticket) {
          finalTicketId = ticket.id;
          // Save full conversation history
          for (const msg of messages) {
            await supabase.from('support_messages').insert({ ticket_id: finalTicketId, role: msg.role, content: msg.content });
          }
          // Save AI reply
          await supabase.from('support_messages').insert({ ticket_id: finalTicketId, role: 'assistant', content: parsed.message });
        }
      } else {
        await supabase.from('support_tickets').update({ escalated: true }).eq('id', ticket_id);
        // Save latest AI reply
        await supabase.from('support_messages').insert({ ticket_id: finalTicketId, role: 'assistant', content: parsed.message });
      }
    } else if (ticket_id) {
      // Save ongoing messages to existing ticket
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'user') {
        await supabase.from('support_messages').insert({ ticket_id, role: 'user', content: lastMsg.content });
      }
      await supabase.from('support_messages').insert({ ticket_id, role: 'assistant', content: parsed.message });
      await supabase.from('support_tickets').update({ last_message_at: new Date().toISOString() }).eq('id', ticket_id);
    }

    return new Response(
      JSON.stringify({ ...parsed, ticket_id: finalTicketId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('ai-support-chat error:', err);
    return new Response(
      JSON.stringify({
        message: "I'm having trouble right now. Please email support@lavlay.com and we'll get back to you within 24 hours.",
        escalated: false,
        ticket_id: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
