import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY         = Deno.env.get('GROQ_API_KEY') ?? '';
const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Base system prompt — grounding rules first, platform facts second
const BASE_SYSTEM_PROMPT = `You are the official support assistant for LavLay (lavlay.com), a Nigerian social media platform that pays users for engaging with content.

STRICT GROUNDING RULES (must follow at all times):
1. You ONLY answer questions about LavLay Nigeria (lavlay.com). Never confuse this with any other business, website, app, or entity that may share a similar name (e.g. there is a LavLay in New York — that is completely different and unrelated).
2. You ONLY use information from the KNOWLEDGE BASE ARTICLES provided below. Do NOT use general knowledge, assumptions, or information from other sources.
3. If a question cannot be answered using the provided knowledge base articles, say: "I don't have specific information about that. Let me connect you with our support team." Then collect name, email, and description and set escalated=true.
4. Never make up policies, prices, or processes. If you are unsure, escalate.
5. If the user asks about something unrelated to LavLay (e.g., general tech help, other apps, general finance), politely say you can only help with LavLay-related questions.

PLATFORM QUICK FACTS (always true):
- LavLay is 100% Nigerian — built for the Nigerian market, uses Nigerian Naira (₦)
- Points convert to cash: 10 points = ₦1
- Withdrawal minimum: ₦1,000 (10,000 matured points)
- Points mature after 7 days (frozen until then)
- Subscription tiers: Free, Daily (1 day, one-time only), Starter (15 days), Basic (30 days), Pro (30 days)
- Only paid subscribers (non-free) can withdraw
- Referral system: earn commission when friends sign up and make payments (up to 10 payments per referred user)
- Withdrawal methods: bank transfer (22+ Nigerian banks), MTN/Airtel/OPay/PalmPay/Kuda mobile money
- Support email: support@lavlay.com

YOUR BEHAVIOUR:
1. Be friendly, concise, and helpful. Use simple English.
2. Always check the KNOWLEDGE BASE ARTICLES below before answering. Use those as your primary source.
3. Answer questions directly using knowledge base facts. Quote specific numbers/rules when relevant.
4. If you cannot resolve the issue (account-specific problems, bugs, payment disputes), collect the user's name, email, and a clear problem description, then set escalated=true.
5. Once you have all three (name + email + description), confirm: "I've created a support ticket. A human agent will follow up within 24 hours."
6. Never make up information. If unsure, say so and offer to escalate.

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

// --- Search knowledge base via RPC ---
async function searchKnowledgeBase(
  supabase: ReturnType<typeof createClient>,
  query: string,
  limit = 3
): Promise<{ title: string; content: string; category: string }[]> {
  try {
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      p_query: query,
      p_limit: limit,
      p_category: null,
    });
    if (error) {
      console.warn('KB search error:', error.message);
      return [];
    }
    return (data ?? []) as { title: string; content: string; category: string }[];
  } catch (e) {
    console.warn('KB search exception:', e);
    return [];
  }
}

// Build the context-injected system prompt with KB articles + optional user context
function buildSystemPrompt(
  articles: { title: string; content: string; category: string }[],
  userContext?: {
    name: string;
    email: string;
    tier: string;
    points: number;
    wallet: number;
  }
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Inject retrieved knowledge base articles
  if (articles.length > 0) {
    prompt += '\n\n--- KNOWLEDGE BASE ARTICLES (use these to answer the question) ---\n';
    articles.forEach((a, i) => {
      prompt += `\n[Article ${i + 1}: ${a.title}]\n${a.content}\n`;
    });
    prompt += '\n--- END OF KNOWLEDGE BASE ARTICLES ---';
  } else {
    prompt += '\n\n[No matching knowledge base articles found for this query. Escalate if you cannot answer from the quick facts above.]';
  }

  // Inject personalised user context for signed-in users
  if (userContext) {
    const maturedApprox = Math.floor(userContext.points * 0.7);
    prompt += `\n\n--- CURRENT USER CONTEXT (do not ask for this info again) ---
Name: ${userContext.name}
Email: ${userContext.email}
Subscription tier: ${userContext.tier}
Points balance: ${userContext.points.toLocaleString()} pts (≈ ₦${(userContext.points / 10).toLocaleString()})
Estimated matured points: ~${maturedApprox.toLocaleString()} pts (≈ ₦${(maturedApprox / 10).toLocaleString()})
Wallet balance: ₦${userContext.wallet.toLocaleString()}
Can withdraw: ${userContext.tier !== 'free' ? 'Yes' : 'No (free tier — must upgrade to a paid plan first)'}

Use this context to give personalised answers (e.g. their exact balance, tier, whether they can withdraw).
Since you already know their name and email, do NOT ask for them again — set escalated=true and populate collected_info automatically when you have enough info to escalate.`;
  }

  return prompt;
}

// Extract a search query from the latest user message
function extractSearchQuery(messages: { role: string; content: string }[]): string {
  // Use the last user message as the search query
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      // Truncate to first 200 chars for the search query
      return messages[i].content.slice(0, 200);
    }
  }
  return '';
}

// --- Groq (primary, free) ---
async function callGroq(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 700,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// --- Claude Haiku (fallback, paid) ---
async function callClaude(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function getAIReply(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  if (GROQ_API_KEY) {
    try {
      return await callGroq(messages, systemPrompt);
    } catch (e) {
      console.warn('Groq failed, falling back to Claude:', e);
    }
  }
  if (ANTHROPIC_API_KEY) {
    return await callClaude(messages, systemPrompt);
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
    const { messages, ticket_id, user_id, user_context } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if ticket is in human mode — don't call AI, just save and acknowledge
    if (ticket_id) {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('mode')
        .eq('id', ticket_id)
        .single();

      if (ticket?.mode === 'human') {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'user') {
          await supabase.from('support_messages').insert({
            ticket_id,
            role: 'user',
            content: lastMsg.content,
          });
          await supabase.from('support_tickets').update({
            last_message_at: new Date().toISOString(),
          }).eq('id', ticket_id);
        }
        return new Response(
          JSON.stringify({ message: null, human_mode: true, ticket_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 1. Extract search query from latest user message
    const searchQuery = extractSearchQuery(messages);

    // 2. Search knowledge base (RAG retrieval)
    const kbArticles = searchQuery ? await searchKnowledgeBase(supabase, searchQuery, 3) : [];

    // 3. Build grounded system prompt with KB articles + user context
    const systemPrompt = buildSystemPrompt(kbArticles, user_context ?? undefined);

    // 4. Call AI with grounded prompt
    const rawText = await getAIReply(messages, systemPrompt);
    const parsed  = parseAIResponse(rawText);

    // Auto-fill collected_info from user_context for signed-in users
    if (user_context && parsed.escalated) {
      parsed.collected_info.name  = parsed.collected_info.name  || user_context.name;
      parsed.collected_info.email = parsed.collected_info.email || user_context.email;
    }

    let finalTicketId = ticket_id;

    if (parsed.escalated && parsed.collected_info.name && parsed.collected_info.email) {
      const info = parsed.collected_info;

      if (!ticket_id) {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .insert({
            user_id:    user_id ?? null,
            name:       info.name,
            email:      info.email,
            category:   info.category ?? 'general',
            subject:    info.description?.slice(0, 100) ?? 'Support request',
            status:     'open',
            priority:   'normal',
            mode:       'ai',
            escalated:  true,
            ai_handled: true,
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
