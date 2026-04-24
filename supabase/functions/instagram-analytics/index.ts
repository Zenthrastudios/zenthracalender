import "https://deno.land/std@0.168.0/http/server.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is not set in Supabase Secrets.");
      throw new Error('AI Configuration Error: Gemini API key is missing on the server.');
    }

    console.log(`GEMINI_API_KEY detected. Length: ${geminiKey.length}. First 4 chars: ${geminiKey.substring(0, 4)}`);

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const { action, posts: providedPosts, stats: providedStats } = await req.json().catch(() => ({}));

    // MODE 1: ANALYZE WITH AI
    if (action === 'analyze_ai' && providedPosts && providedStats) {
      console.log("Analyzing data with Gemini 2.0/3.0...");

      const prompt = `
        As an Instagram Content Strategist, analyze these recent posts and stats:
        Stats: ${JSON.stringify(providedStats)}
        Posts: ${JSON.stringify(providedPosts.slice(0, 15))}

        Return a JSON object with:
        {
          "winning_factors": ["string"],
          "losing_factors": ["string"],
          "best_performer_analysis": "string explanation of why the top post worked",
          "audience_persona": "vivid description of who is engaging",
          "topic_clusters": [{"name": "string", "count": number}]
        }
      `;

      // Reverting to direct REST API (Robust Fetch).
      // Prioritizing models based on User's 2026 Documentation.
      // 1. gemini-3-flash-preview (Latest)
      // 2. gemini-2.0-flash (Stable Predecessor)
      // 3. gemini-pro (Legacy v1 backup)
      const models = [
        { id: 'gemini-3-flash-preview', version: 'v1beta' },
        { id: 'gemini-2.0-flash', version: 'v1beta' },
        { id: 'gemini-pro', version: 'v1' }
      ];

      let aiParsed = null;
      let lastError = null;

      for (const modelConfig of models) {
        if (aiParsed) break;

        try {
          console.log(`Analyzing with model: ${modelConfig.id} (${modelConfig.version})...`);
          const geminiUrl = `https://generativelanguage.googleapis.com/${modelConfig.version}/models/${modelConfig.id}:generateContent?key=${geminiKey}`;

          const payload: any = {
            contents: [{ parts: [{ text: prompt }] }]
          };

          // Only add JSON enforcement for v1beta models that support it
          if (modelConfig.version === 'v1beta') {
            payload.generationConfig = { responseMimeType: "application/json" };
          }

          const aiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const aiJson = await aiRes.json();

          if (!aiRes.ok) {
            console.error(`Model ${modelConfig.id} failed (${aiRes.status}):`, aiJson.error?.message || aiJson);
            lastError = aiJson;
            continue;
          }

          if (aiJson.candidates?.[0]?.content?.parts?.[0]?.text) {
            const rawText = aiJson.candidates[0].content.parts[0].text;
            const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '');
            aiParsed = JSON.parse(jsonStr);
            console.log(`Success with ${modelConfig.id}`);
          } else {
            console.error(`Model ${modelConfig.id} returned empty content.`);
          }
        } catch (e) {
          console.error(`Error with ${modelConfig.id}:`, e);
          lastError = e;
        }
      }

      if (!aiParsed) {
        throw new Error(`All analysis models failed. Last error: ${JSON.stringify(lastError)}`);
      }

      return new Response(
        JSON.stringify({ success: true, ai_analysis: aiParsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 2: CHAT AGENT (New Feature)
    if (action === 'chat_agent') {
      const { messages, context } = await req.json();

      const systemPrompt = `
        You are an Elite Instagram Strategist & Content Agent.
        
        CONTEXT DATA:
        Stats: ${JSON.stringify(context.stats)}
        Top 5 Recent Posts: ${JSON.stringify(context.posts?.slice(0, 5))}
        
        YOUR GOAL:
        Help the user improve their reach, engagement, and content strategy based strictly on their actual data provided above.
        
        GUIDELINES:
        1. Be specific. Quote their actual metrics (e.g., "Your post about X got 200 likes...").
        2. Be actionable. Don't just give generic advice. Give them a specific hook or content idea for next week.
        3. Keep it conversational and encouraging but high-level professional.
      `;

      // Construct history for Gemini
      // Map 'assistant' role to 'model' for Gemini API
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }] // Prime the conversation with context
        },
        ...messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ];

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`;

      const payload = {
        contents: contents,
        generationConfig: {
          // Thinking config for deeper reasoning if available, otherwise just standard
          temperature: 0.7
        }
      };

      console.log('Agent Chat Message Count:', messages.length);

      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const aiJson = await aiRes.json();

      if (!aiRes.ok) {
        console.error('Agent Error:', aiJson);
        throw new Error(aiJson.error?.message || 'Failed to chat with agent');
      }

      const reply = aiJson.candidates?.[0]?.content?.parts?.[0]?.text || "I'm thinking...";

      return new Response(
        JSON.stringify({ success: true, reply }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 3: FETCH INSTAGRAM DATA (Default)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: integration, error: intError } = await supabaseClient
      .from('instagram_integrations')
      .select('access_token, instagram_account_id')
      .eq('user_id', user.id)
      .single();

    if (intError || !integration?.access_token) {
      throw new Error('Instagram not connected. Please connect in Settings.');
    }

    const accessToken = integration.access_token;
    const instagramAccountId = integration.instagram_account_id || 'me';

    // Detect if this is a Basic Display token (starts with IG) or Business Token
    const isBasicToken = accessToken.startsWith('IG');
    const baseUrl = isBasicToken ? 'https://graph.instagram.com' : 'https://graph.facebook.com/v19.0';
    const endpoint = isBasicToken ? '/me/media' : `/${instagramAccountId}/media`;

    // Fields vary slightly between APIs
    const fields = isBasicToken
      ? 'id,caption,media_type,media_url,timestamp,username'
      : 'id,caption,media_type,media_url,timestamp,like_count,comments_count';

    const mediaUrl = `${baseUrl}${endpoint}?fields=${fields}&access_token=${accessToken}`;

    console.log(`Fetching from ${isBasicToken ? 'Basic Display' : 'Business'} API...`);
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      console.error("Instagram API Error:", mediaData.error);
      throw new Error(mediaData.error.message);
    }

    const simplifiedPosts = (mediaData.data || []).map((post: any) => ({
      caption: post.caption || '',
      type: post.media_type,
      media_url: post.media_url,
      timestamp: post.timestamp,
      likes: post.like_count || 0,
      comments: post.comments_count || 0
    }));

    // Basic Stats
    const totalLikes = simplifiedPosts.reduce((sum: number, p: any) => sum + p.likes, 0);
    const totalComments = simplifiedPosts.reduce((sum: number, p: any) => sum + p.comments, 0);
    const avgLikes = simplifiedPosts.length > 0 ? totalLikes / simplifiedPosts.length : 0;

    return new Response(
      JSON.stringify({
        success: true,
        account_type: isBasicToken ? 'BASIC' : 'BUSINESS',
        stats: {
          total_likes: totalLikes,
          total_comments: totalComments,
          avg_likes: Math.round(avgLikes)
        },
        recent_posts: simplifiedPosts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
