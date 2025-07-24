import { createSupabaseServerClient } from 'lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const json = await request.json();

  // Validate the main payload structure
  if (!json || !json.data) {
    return new NextResponse('Invalid payload structure, missing "data" object.', { status: 400 });
  }

  const { agent_id, conversation_id, metadata, analysis } = json.data;

  // --- Start: Organization Quota Update Logic ---
  const call_duration_secs = metadata?.call_duration_secs;

  if (agent_id && typeof call_duration_secs === 'number' && call_duration_secs > 0) {
    try {
      // Step 1: Find the user_id from the elevenlabs_agent_id
      const { data: agentData, error: agentError } = await supabase
        .from('user_elevenlabs_agents')
        .select('user_id')
        .eq('elevenlabs_agent_id', agent_id)
        .single();

      if (agentError) throw new Error(`Could not find agent mapping for agent_id ${agent_id}: ${agentError.message}`);
      if (!agentData) throw new Error(`No agent mapping found for agent_id ${agent_id}`);

      // Step 2: Find the organization_id from the user_id
      const { data: orgUserData, error: orgUserError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', agentData.user_id)
        .single();
      
      if (orgUserError) throw new Error(`Could not find organization for user ${agentData.user_id}: ${orgUserError.message}`);
      if (!orgUserData) throw new Error(`User ${agentData.user_id} is not associated with any organization`);
      
      // Step 3: Increment the organization's quota usage in minutes (rounding up)
      const duration_in_minutes = Math.ceil(call_duration_secs / 60.0);
      
      const { error: rpcError } = await supabase.rpc('increment_organization_usage', {
          org_id: orgUserData.organization_id,
          minutes_to_add: duration_in_minutes
      });

      if (rpcError) {
          throw new Error(`Failed to update quota via RPC: ${rpcError.message}`);
      }
      
      console.log(`Quota for organization ${orgUserData.organization_id} updated by ${duration_in_minutes} minutes.`);

    } catch (quotaError: any) {
      // Log any errors during the quota update process but don't stop execution.
      // This ensures that evaluation criteria are still saved even if quota logic fails.
      console.error('Error during organization quota update:', quotaError.message);
    }
  }
  // --- End: Organization Quota Update Logic ---

  // --- Start: Evaluation Criteria Insertion Logic ---
  if (!analysis || !analysis.evaluation_criteria_results) {
    // This is not necessarily an error, as a call might not have criteria.
    // If we successfully updated the quota, we can return a success message.
    if (typeof call_duration_secs === 'number') {
      return new NextResponse('Quota updated. No evaluation results were present in the payload.', { status: 200 });
    }
    // If there was no duration and no criteria, then the payload is invalid for this endpoint.
    return new NextResponse('Payload is missing required fields: "metadata.call_duration_secs" or "analysis.evaluation_criteria_results".', { status: 400 });
  }

  const { evaluation_criteria_results } = analysis;

  const records = Object.entries(evaluation_criteria_results).map(([criteria_id, result]: [string, any]) => ({
    elevenlabs_agent_id: agent_id,
    conversation_id,
    criteria_id,
    result: result.result,
    rationale: result.rationale,
  }));
  
  if (records.length > 0) {
    const { error } = await supabase.from('evaluation_criteria_results').insert(records);

    if (error) {
      console.error('Error inserting evaluation criteria results:', error);
      // Report this error as it's a primary function of this webhook
      return new NextResponse('Error inserting evaluation data into the database.', { status: 500 });
    }
  }

  return new NextResponse('Webhook processed successfully.', { status: 200 });
}