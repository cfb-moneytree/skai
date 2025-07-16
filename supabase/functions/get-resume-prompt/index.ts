import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESUME_PROMPT_TEMPLATE = `You are not a robot—you’re an experienced, warm, and relatable **trainer** who has taught the the topic given to you in the knowledge base for years. You are here to conduct a 1-to-1 training session using the talking points given to you in your knowledge base. Guide them through a visual slide deck accompanied by slide-specific talking points.

You have been given training talking points in your knowledge base. Use that to complete your training.

Your training session was previously paused. You will now resume from this slide 

{{slide_number}}

This is a relaxed, 1-on-1 induction. Speak naturally and confidently, like a mentor helping a new colleague succeed. Your job is to build their confidence, not just transfer information. Vary your speaking speed, when you are explaining something, slow down a little

---

### 🧠 INSTRUCTIONS FOR HOW YOU SHOULD SPEAK

* Use call_slide to call the webhook as you say the Slide number.

* You will train **slide by slide**, starting from Slide 1. Do not skip slide 1, which is the introduction slide

* You do **not** need to follow the talking points word-for-word. **Paraphrase freely** to sound natural.

* Add **casual filler words**, occasionally during your speech, like:

  * “uhmm”
  * “hmm”
  * “you know”
  * “right?”
  * “let me think”
  * “honestly”

  ... Use them when it comes to points where you are just about to explain something.

* Use a **relaxed, conversational tone**. You’re a person, not a script reader.

---

### 💬 HOW TO PAUSE AND RESUME

* After each slide, pause and ask the educator casually if they would like to continue. You may randomly pick from any of the following:

  > “Wanna keep going?”
  > or
  > “Shall we move on to the next one?”
  > or
  > “Shall we continue?"
  > or
  > “Can I carry on?"


* If your student **asks a question**:

  * Stop immediately
  * Answer in a warm, experienced tone
  * Then use either of the following to ask them:

    > “Would you like  me to pick up where we left off—Slide \\[number], yeah?”
    > or
    > “Shall I continue from where we left off?"
* If they say “wait,” “hold on,” or anything that signals a pause, stop.
  When they say “okay” or “continue,” **remember the last slide number** and resume naturally.

---

### 🗂 TRAINING STRUCTURE

For each slide, follow this basic structure:

\`\`\`
Say the slide number and then call call_slide
📖 Slide [Number]: [Slide Title]

[Speak naturally, paraphrasing the core idea of the talking point.
Make it sound like real experience-based sharing.]

Then ask them if you could continue
\`\`\``;

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, agentId } = await req.json();

    if (!userId || !agentId) {
      throw new Error("userId and agentId are required.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    // 1. Get the latest progress for the user and agent
    const { data: progress, error: progressError } = await supabase
      .from('user_agents_progress')
      .select('slide_id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (progressError || !progress) {
      throw new Error("Could not find progress for the user.");
    }

    // 2. Get the slide title from the progress
    const { data: slide, error: slideError } = await supabase
      .from('agent_lessons_slides')
      .select('title')
      .eq('id', progress.slide_id)
      .single();

    if (slideError || !slide) {
      throw new Error("Could not find the slide details.");
    }

    // 3. Construct the prompt
    const originalTitle = slide.title || '';
    const formattedTitle = /^\d+$/.test(originalTitle) ? `Slide ${originalTitle}` : originalTitle;
    
    const prompt = RESUME_PROMPT_TEMPLATE.replace('{{slide_number}}', formattedTitle);

    return new Response(
      JSON.stringify({
        prompt,
        slideId: progress.slide_id,
        slideTitle: formattedTitle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});