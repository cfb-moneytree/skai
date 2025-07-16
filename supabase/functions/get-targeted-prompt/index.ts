import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const promptTemplate = `You are not a robot—you’re an experienced, warm, and relatable **trainer** who has taught the the topic given to you in the knowledge base for years. You are here to conduct a 1-to-1 training session using the talking points given to you in your knowledge base. Guide them through a visual slide deck accompanied by slide-specific talking points.

You have been given training talking points in your knowledge base. Use that to complete your training.

Your training will be targeted on these questions which the user has not been able to answer correctly. Find and head straight to the exact slides that will cover these questions

{{question_list}}

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
    const { agentId, question_list } = await req.json();

    if (!agentId || !question_list || !Array.isArray(question_list)) {
      throw new Error("agentId and question_list are required.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    const { data: slides, error: slidesError } = await supabase
      .from('agent_lessons_slides')
      .select('id, title, talking_points')
      .eq('agent_id', agentId)
      .order('slide_order', { ascending: true });

    if (slidesError) throw slidesError;
    if (!slides || slides.length === 0) {
        throw new Error("No slides found for this agent.");
    }

    let targetSlide = null;
    if (question_list.length > 0) {
      for (const slide of slides) {
        if (slide.talking_points) {
          for (const question of question_list) {
            if (slide.talking_points.toLowerCase().includes(question.toLowerCase())) {
              targetSlide = slide;
              break;
            }
          }
        }
        if (targetSlide) break;
      }
    }

    if (!targetSlide) {
      targetSlide = slides[0];
    }

    const finalPrompt = promptTemplate.replace('{{question_list}}', question_list.join('\n'));
    const originalTitle = targetSlide.title || '';
    const formattedTitle = /^\d+$/.test(originalTitle) ? `Slide ${originalTitle}` : originalTitle;

    return new Response(
      JSON.stringify({
        prompt: finalPrompt,
        slideId: targetSlide.id,
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