import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bot user ID - set this to the UUID of your bot account in the users table
const BOT_USER_ID = Deno.env.get('RSS_BOT_USER_ID') ?? ''

// Max articles to post per feed per run (prevent flooding)
const MAX_ARTICLES_PER_FEED = 3

// Simple XML tag extractor (no external dependency needed)
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const match = xml.match(regex)
  if (!match) return ''
  return (match[1] || match[2] || '').trim()
}

// Extract all items from RSS XML (works for both standard RSS and YouTube Atom feeds)
function parseRSSItems(xml: string, feedType: string): Array<{
  title: string
  link: string
  guid: string
  description: string
  image: string | null
  pubDate: string | null
  videoId: string | null
}> {
  const items: Array<{
    title: string
    link: string
    guid: string
    description: string
    image: string | null
    pubDate: string | null
    videoId: string | null
  }> = []

  if (feedType === 'youtube') {
    // Parse Atom feed format used by YouTube
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
    let match
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1]
      const title = extractTag(entryXml, 'title')

      // YouTube link is in <link rel="alternate" href="..."/>
      const linkMatch = entryXml.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i)
      const link = linkMatch ? linkMatch[1] : ''

      // Video ID from <yt:videoId>
      const videoId = extractTag(entryXml, 'yt:videoId')
      const guid = videoId || link

      // Description from <media:description>
      const descMatch = entryXml.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/i)
      const description = descMatch ? descMatch[1].trim() : ''

      // Thumbnail from <media:thumbnail>
      const thumbMatch = entryXml.match(/<media:thumbnail[^>]+url="([^"]+)"/i)
      const image = thumbMatch ? thumbMatch[1] : (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null)

      const pubDate = extractTag(entryXml, 'published') || null

      if (title && link) {
        items.push({ title, link, guid, description, image, pubDate, videoId })
      }
    }
  } else {
    // Standard RSS parsing
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    let match
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]
      const title = extractTag(itemXml, 'title')
      const link = extractTag(itemXml, 'link')
      const guid = extractTag(itemXml, 'guid') || link
      const description = extractTag(itemXml, 'description')
      const pubDate = extractTag(itemXml, 'pubDate') || null

      // Try to find image from multiple sources
      let image: string | null = null

      // 1. Check <media:content> or <media:thumbnail>
      const mediaMatch = itemXml.match(/url="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp|gif)[^"]*)"/i)
      if (mediaMatch) {
        image = mediaMatch[1]
      }

      // 2. Check <enclosure> with image type
      if (!image) {
        const enclosureMatch = itemXml.match(/<enclosure[^>]+url="(https?:\/\/[^"]+)"[^>]+type="image/i)
        if (enclosureMatch) {
          image = enclosureMatch[1]
        }
      }

      // 3. Extract first image from description HTML
      if (!image && description) {
        const imgMatch = description.match(/<img[^>]+src="(https?:\/\/[^"]+)"/i)
        if (imgMatch) {
          image = imgMatch[1]
        }
      }

      if (title && link) {
        items.push({ title, link, guid, description, image, pubDate, videoId: null })
      }
    }
  }

  return items
}

// Fetch og:image from an article page
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LavLay-NewsBot/1.0 (compatible; preview fetcher)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!response.ok) return null

    // Only read first 50KB to find meta tags (they're in <head>)
    const reader = response.body?.getReader()
    if (!reader) return null

    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      // Stop early if we've passed </head>
      if (html.includes('</head>')) break
    }
    reader.cancel()

    // Try og:image first
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (ogMatch) return ogMatch[1]

    // Try twitter:image
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
    if (twMatch) return twMatch[1]

    return null
  } catch {
    return null
  }
}

// Decode HTML entities (named + numeric)
function decodeEntities(text: string): string {
  // Decode numeric entities: &#8216; &#x2018; etc.
  let result = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))

  // Decode common named entities
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#039;': "'", '&apos;': "'", '&nbsp;': ' ',
    '&lsquo;': '\u2018', '&rsquo;': '\u2019',
    '&ldquo;': '\u201C', '&rdquo;': '\u201D',
    '&ndash;': '\u2013', '&mdash;': '\u2014',
    '&hellip;': '\u2026', '&trade;': '\u2122',
    '&copy;': '\u00A9', '&reg;': '\u00AE',
    '&bull;': '\u2022', '&middot;': '\u00B7',
  }
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char)
  }
  return result
}

// Strip HTML tags and truncate for post content
function cleanDescription(html: string, maxLength = 1000): string {
  let text = html.replace(/<[^>]*>/g, '')
  text = decodeEntities(text)
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...'
  }
  return text
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not available')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    if (!BOT_USER_ID) {
      throw new Error('RSS_BOT_USER_ID environment variable not set')
    }

    console.log('📰 Starting RSS News Bot...')

    // 1. Get all active feeds
    const { data: feeds, error: feedsError } = await supabase
      .from('rss_feeds')
      .select('*')
      .eq('is_active', true)

    if (feedsError) throw feedsError

    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({ status: true, message: 'No active feeds', posted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let totalPosted = 0
    const results: Array<{ feed: string; posted: number; errors: string[] }> = []

    // 2. Process each feed
    for (const feed of feeds) {
      const feedResult = { feed: feed.title, posted: 0, errors: [] as string[] }
      const feedType = feed.feed_type || (feed.category === 'youtube' ? 'youtube' : 'rss')

      try {
        console.log(`📡 Fetching: ${feed.title} (${feed.url})`)

        // Fetch the RSS feed
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'LavLay-NewsBot/1.0',
            'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml',
          },
        })

        if (!response.ok) {
          feedResult.errors.push(`HTTP ${response.status}`)
          results.push(feedResult)
          continue
        }

        const xml = await response.text()
        const items = parseRSSItems(xml, feedType)

        console.log(`  Found ${items.length} articles in ${feed.title}`)

        // 3. Get already posted GUIDs for this feed
        const { data: existing } = await supabase
          .from('rss_posted_articles')
          .select('article_guid')
          .eq('feed_id', feed.id)

        const postedGuids = new Set((existing || []).map(e => e.article_guid))

        // 4. Filter to new articles only
        const newItems = items.filter(item => !postedGuids.has(item.guid))
        const toPost = newItems.slice(0, MAX_ARTICLES_PER_FEED)

        console.log(`  ${newItems.length} new articles, posting ${toPost.length}`)

        // 5. Post each new article
        for (const article of toPost) {
          try {
            const isYouTube = !!article.videoId

            // For YouTube: store thumbnail as image + video URL in content
            // For news: fetch og:image if not in RSS
            let imageUrl: string | null = null
            if (isYouTube) {
              // YouTube thumbnail as fallback image
              imageUrl = article.image || `https://img.youtube.com/vi/${article.videoId}/hqdefault.jpg`
            } else {
              imageUrl = article.image
              if (!imageUrl && article.link) {
                console.log(`  🔍 Fetching og:image for: ${article.title}`)
                imageUrl = await fetchOgImage(article.link)
                if (imageUrl) {
                  console.log(`  🖼️ Found og:image: ${imageUrl.substring(0, 80)}...`)
                }
              }
            }

            // Build post content (decode HTML entities in title)
            const cleanTitle = decodeEntities(article.title)
            let content: string
            if (isYouTube) {
              // YouTube: title + video URL - Post.tsx will detect URL and show player, title as caption
              content = `${cleanTitle}\n\n${article.link}`
            } else {
              const description = cleanDescription(article.description)
              const categoryEmoji = feed.category === 'tech' ? '💻'
                : feed.category === 'business' ? '📊'
                : feed.category === 'lifestyle' ? '✨'
                : '📰'
              content = `${categoryEmoji} **${cleanTitle}**\n\n${description}\n\n🔗 Read more: ${article.link}\n\n📌 Source: ${feed.title}`
            }

            // Create the post
            const { data: post, error: postError } = await supabase
              .from('posts')
              .insert({
                user_id: BOT_USER_ID,
                content: content,
                image_url: imageUrl || null,
                images_count: imageUrl ? 1 : 0,
              })
              .select('id')
              .single()

            if (postError) {
              console.error(`  Error posting "${article.title}":`, postError.message, postError.details, postError.hint)
              feedResult.errors.push(`Post failed: ${article.title} - ${postError.message}`)
              continue
            }

            // If there's an image (news only), also add to post_images
            if (imageUrl && post) {
              await supabase
                .from('post_images')
                .insert({
                  post_id: post.id,
                  image_url: imageUrl,
                  image_order: 1,
                })
            }

            // Record in dedup table
            await supabase
              .from('rss_posted_articles')
              .insert({
                feed_id: feed.id,
                article_guid: article.guid,
                title: article.title,
                link: article.link,
                image_url: imageUrl,
                post_id: post?.id,
              })

            feedResult.posted++
            totalPosted++
            console.log(`  ✅ Posted: ${article.title}${imageUrl ? ' (with image)' : ' (no image)'}`)
          } catch (articleErr: any) {
            console.error(`  Error with article "${article.title}":`, articleErr.message)
            feedResult.errors.push(articleErr.message)
          }
        }

        // Update last_fetched_at
        await supabase
          .from('rss_feeds')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', feed.id)

      } catch (feedErr: any) {
        console.error(`Error processing feed ${feed.title}:`, feedErr.message)
        feedResult.errors.push(feedErr.message)
      }

      results.push(feedResult)
    }

    console.log(`📰 RSS Bot complete. Posted ${totalPosted} articles from ${feeds.length} feeds.`)

    return new Response(
      JSON.stringify({
        status: true,
        message: `Posted ${totalPosted} articles`,
        total_posted: totalPosted,
        feeds_processed: feeds.length,
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ RSS Bot error:', error)
    return new Response(
      JSON.stringify({ status: false, message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
