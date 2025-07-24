import { createSupabaseServerClient } from 'lib/supabase/server';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
}

export interface AgentDataFromUI {
  name: string;
  language: string;
  voice_id: string;
  instructions: string;
  firstMessage: string;
  evaluation_criteria?: EvaluationCriterion[];
  knowledge_base_text_entry?: { id: string; name: string; type: "text" };
  cover_image?: string | null;
  passing_score?: number | null;
  category_id?: string;
  monthly_play_limit?: number | null;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  type: "prompt";
  conversation_goal_prompt: string;
  use_knowledge_base: boolean;
}

const API_BASE_URL = "https://api.elevenlabs.io";

const RAG_CONFIG = {
  enabled: true,
  embedding_model: "e5_mistral_7b_instruct",
  max_vector_distance: 0.6,
  max_documents_length: 50000,
  max_retrieved_rag_chunks_count: 20,
};

const BUILT_IN_TOOLS = {
  "end_call": {
    "type": "system",
    "name": "end_call",
    "description": ""
  },
  "language_detection": {
    "type": "system",
    "name": "language_detection",
    "description": ""
  },
  "skip_turn": {
    "type": "system",
    "name": "skip_turn",
    "description": ""
  },
};

async function getElevenLabsApiKey(): Promise<string | undefined> {
  if (process.env.APP_ENV === 'local') {
    console.log("Using ElevenLabs API key from local environment variables.");
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn("APP_ENV is 'local' but ELEVENLABS_API_KEY is not set in environment variables.");
    }
    return apiKey;
  } else {
    console.log("Fetching ElevenLabs API key from Supabase.");
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from('api_credentials')
        .select('secret')
        .eq('service', 'elevenlabs')
        .single();

      if (error) {
        console.warn(`Error fetching ElevenLabs API key from Supabase: ${error.message}. Proceeding without key.`);
        return undefined;
      }
      if (!data || !data.secret) {
        console.warn("ElevenLabs API key not found in Supabase for service 'elevenlabs'. Proceeding without key.");
        return undefined;
      }
      console.log("Successfully fetched ElevenLabs API key from Supabase.");
      return data.secret;
    } catch (e: any) {
      console.warn(`Unexpected error fetching ElevenLabs API key from Supabase: ${e.message}. Proceeding without key.`);
      return undefined;
    }
  }
}

async function getActiveMcpToolIds(): Promise<string[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: mcpTools, error: mcpToolsError } = await supabase
      .from("mcp_tools")
      .select("id")
      .eq("active", true);

    if (mcpToolsError) {
      console.warn("Error fetching active MCP tools from Supabase, proceeding without them:", mcpToolsError.message);
      return [];
    }
    if (mcpTools) {
      const activeMcpToolIds = mcpTools.map(tool => tool.id);
      console.log("Fetched active MCP tool IDs:", activeMcpToolIds);
      return activeMcpToolIds;
    }
    return [];
  } catch (e: any) {
    console.warn("Exception fetching active MCP tools, proceeding without them:", e.message);
    return [];
  }
}

export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error(
      "ElevenLabs API key is not configured (either locally or via Supabase)."
    );
    throw new Error("ElevenLabs API key is not configured.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v2/voices`, {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (getVoices - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to fetch voices from ElevenLabs: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (data && Array.isArray(data.voices)) {
      const allVoices = data.voices as ElevenLabsVoice[];
      return allVoices;
    } else {
      console.error(
        "Unexpected response structure from ElevenLabs getVoices:",
        data
      );
      throw new Error("Unexpected response structure for voices.");
    }
  } catch (error) {
    console.error("Error fetching ElevenLabs voices:", error);
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to fetch voices")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching voices: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface ElevenLabsCreatedAgent {
  agent_id: string;
}

export async function createElevenLabsAgent(
  agentData: AgentDataFromUI
): Promise<ElevenLabsCreatedAgent> {

  const apiKey = await getElevenLabsApiKey();
  const activeMcpToolIds = await getActiveMcpToolIds();
  if (!apiKey) {
    console.error(
      "ElevenLabs API key is not configured (either locally or via Supabase)."
    );
    throw new Error("ElevenLabs API key is not configured.");
  }

  const systemPrompt = agentData.instructions;
  const payloadTemplate = {
    conversation_config: {
      agent: {
        prompt: {
          llm: "gemini-2.0-flash-001",
          mcp_server_ids: [],
          native_mcp_server_ids: [],
          temperature: 0,
          max_tokens: -1,
        },
        dynamic_variables: {
          dynamic_variable_placeholders: {},
        },
      },
      asr: {
        quality: "high",
        provider: "elevenlabs",
        user_input_audio_format: "pcm_16000",
        keywords: [],
      },
      tts: {
        model_id: "eleven_flash_v2",
        agent_output_audio_format: "pcm_16000",
        optimize_streaming_latency: 3,
        stability: 0.5,
        similarity_boost: 0.8,
      },
      turn: {
        turn_timeout: 7,
        silence_end_call_timeout: 20,
      },
      conversation: {
        max_duration_seconds: 300,
        client_events: [
          "audio",
          "interruption",
          "user_transcript",
          "agent_response",
          "agent_response_correction",
        ],
      },
      language_presets: {},
      is_blocked_ivc: false,
      is_blocked_non_ivc: false,
      ignore_safety_evaluation: false,
    },
    platform_settings: {
      widget: {
        variant: "full",
        avatar: {
          type: "orb",
          color_1: "#2792DC",
          color_2: "#9CE6E6",
        },
        feedback_mode: "during",
        terms_text:
          '#### Terms and conditions\\n\\nBy clicking "Agree," and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as described in the Privacy Policy.\\nIf you do not wish to have your conversations recorded, please refrain from using this service.',
        show_avatar_when_collapsed: true,
      },
      evaluation: {},
      auth: {
        allowlist: [],
      },
      overrides: {
        conversation_config_override: {
          conversation: {
            text_only: true,
          },
          agent: {
            first_message: false,
            language: false,
            prompt: {
              prompt: true
            }
          }
        },
      },
      call_limits: {
        agent_concurrency_limit: -1,
        daily_limit: 100000,
      },
      privacy: {
        record_voice: true,
        retention_days: 730,
        delete_transcript_and_pii: true,
        delete_audio: true,
        apply_to_existing_conversations: false,
        zero_retention_mode: false,
      },
      data_collection: {},
      workspace_overrides: {},
    },
  };

  const payload = {
    ...payloadTemplate,
    name: agentData.name,
    platform_settings: { 
      ...payloadTemplate.platform_settings,
      evaluation: {
        ...payloadTemplate.platform_settings.evaluation,
        criteria: agentData.evaluation_criteria || [],
      },
    },
    conversation_config: {
      ...payloadTemplate.conversation_config,
      agent: {
        ...payloadTemplate.conversation_config.agent,
        language: agentData.language,
        first_message: agentData.firstMessage || "",
        prompt: {
          ...payloadTemplate.conversation_config.agent.prompt,
          prompt: systemPrompt,
          knowledge_base: agentData.knowledge_base_text_entry ? [agentData.knowledge_base_text_entry] : [],
          rag: RAG_CONFIG,
          built_in_tools: BUILT_IN_TOOLS,
          tool_ids: activeMcpToolIds,
        },
      },
      tts: {
        ...payloadTemplate.conversation_config.tts,
        voice_id: agentData.voice_id,
      },
    },
  };

  console.log(
    "Sending payload to ElevenLabs for agent creation:",
    JSON.stringify(payload, null, 2)
  );

  try {
    const response = await fetch(`${API_BASE_URL}/v1/convai/agents/create`, {
      method: "POST",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (createAgent - ${response.status} ${response.statusText}):`,
        errorBody
      );
      try {
        const parsedError = JSON.parse(errorBody);
        console.error("Parsed ElevenLabs Error:", parsedError);
      } catch (e) {
      }
      throw new Error(
        `Failed to create agent via ElevenLabs: ${response.status} ${response.statusText}`
      );
    }

    const createdAgentData = await response.json();
    if (!createdAgentData || !createdAgentData.agent_id) {
      console.error(
        "Unexpected response structure from ElevenLabs createAgent:",
        createdAgentData
      );
      throw new Error("Unexpected response structure after creating agent.");
    }
    return createdAgentData as ElevenLabsCreatedAgent;
  } catch (error) {
    console.error("Error creating ElevenLabs agent:", error);
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to create agent")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while creating the agent: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
export interface ElevenLabsAgentDetails {
  agent_id: string;
  name: string;
  conversation_config?: {
    tts?: {
      voice_id?: string;
    };
    agent?: {
      first_message?: string;
      language?: string;
      prompt?: {
        prompt?: string;
        knowledge_base?: KnowledgeBaseItem[];
      };
    };
  };
}
export interface CallHistoryConversation {
  agent_id: string;
  conversation_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status: string;
  call_successful: string;
  agent_name: string;
}

export interface ConversationsResponse {
  conversations: CallHistoryConversation[];
  has_more: boolean;
  next_cursor: string | null;
}
export interface TranscriptEntry {
  role: "user" | "agent" | string;
  time_in_call_secs: number;
  message: string;
}

export interface ConversationMetadata {
  start_time_unix_secs: number;
  call_duration_secs: number;
}

export interface ConversationAnalysis {
  evaluation_criteria_results?: Record<string, any>;
  data_collection_results?: Record<string, any>;
  call_successful: "success" | "failure" | string;
  transcript_summary?: string | null;
}

export interface DetailedConversation {
  agent_id: string;
  conversation_id: string;
  status: string;
  transcript: TranscriptEntry[];
  metadata: ConversationMetadata;
  analysis: ConversationAnalysis;
  has_audio: boolean;
  has_user_audio: boolean;
  has_response_audio: boolean;
}

export async function getElevenLabsAgentDetails(
  agentId: string
): Promise<ElevenLabsAgentDetails | null> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase).");
    throw new Error("ElevenLabs API key is not configured.");
  }
  if (!agentId) {
    console.error("Agent ID is required to fetch agent details.");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/convai/agents/${agentId}`, {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Agent with ID ${agentId} not found on ElevenLabs.`);
        return null;
      }
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (getAgentDetails ${agentId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to fetch agent details from ElevenLabs for agent ${agentId}: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data as ElevenLabsAgentDetails;
  } catch (error) {
    console.error(
      `Error fetching ElevenLabs agent details for agent ${agentId}:`,
      error
    );
    if (
      error instanceof Error &&
      (error.message.startsWith("Failed to fetch agent details") ||
        error.message === "ElevenLabs API key is not configured.")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching agent details for ${agentId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
export async function updateElevenLabsAgent(
  agentId: string,
  agentData: Partial<AgentDataFromUI>
): Promise<void> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase).");
    throw new Error("ElevenLabs API key is not configured.");
  }
  if (!agentId) {
    console.error("Agent ID is required to update an agent.");
    throw new Error("Agent ID is required for update.");
  }

  const updatePayload: any = {};

  const currentAgentDetails = await getElevenLabsAgentDetails(agentId);
  const existingKnowledgeBase = currentAgentDetails?.conversation_config?.agent?.prompt?.knowledge_base || [];

  if (agentData.name !== undefined) {
    updatePayload.name = agentData.name;
  }

  const conversationConfigUpdate: any = {};
  const agentConfigUpdate: any = {};
  const promptConfigUpdate: any = {};
  const ttsConfigUpdate: any = {};

  let needsAgentConfigUpdate = false;
  let needsTtsConfigUpdate = false;

  if (agentData.language !== undefined) {
    agentConfigUpdate.language = agentData.language;
    needsAgentConfigUpdate = true;
  }
  if (agentData.firstMessage !== undefined) {
    agentConfigUpdate.first_message = agentData.firstMessage;
    needsAgentConfigUpdate = true;
  }

  if (agentData.instructions !== undefined) {
    const currentInstructions =
      agentData.instructions === undefined ? "" : agentData.instructions;

    promptConfigUpdate.prompt = currentInstructions;
    promptConfigUpdate.llm = "gemini-2.0-flash-001";
    let newKnowledgeBase = existingKnowledgeBase.filter(item => item.type !== 'text');
    if (agentData.knowledge_base_text_entry) {
      newKnowledgeBase.push(agentData.knowledge_base_text_entry);
    }
    promptConfigUpdate.knowledge_base = newKnowledgeBase;
    
    promptConfigUpdate.temperature = 0;
    promptConfigUpdate.max_tokens = -1;
    promptConfigUpdate.rag = RAG_CONFIG;
    promptConfigUpdate.built_in_tools = BUILT_IN_TOOLS;

    agentConfigUpdate.prompt = promptConfigUpdate;
    needsAgentConfigUpdate = true;
  }

  const activeMcpToolIds = await getActiveMcpToolIds();
  if (activeMcpToolIds.length > 0) {
    if (!agentConfigUpdate.prompt) {
      agentConfigUpdate.prompt = {};
    }
    agentConfigUpdate.prompt.tool_ids = activeMcpToolIds;
    needsAgentConfigUpdate = true;
  }

  if (needsAgentConfigUpdate) {
    conversationConfigUpdate.agent = agentConfigUpdate;
  }

  if (agentData.voice_id !== undefined) {
    ttsConfigUpdate.voice_id = agentData.voice_id;
    ttsConfigUpdate.model_id = "eleven_flash_v2";
    ttsConfigUpdate.agent_output_audio_format = "pcm_16000";
    ttsConfigUpdate.optimize_streaming_latency = 3;
    ttsConfigUpdate.stability = 0.5;
    ttsConfigUpdate.similarity_boost = 0.8;
    needsTtsConfigUpdate = true;
  }

  if (needsTtsConfigUpdate) {
    conversationConfigUpdate.tts = ttsConfigUpdate;
  }

  if (Object.keys(conversationConfigUpdate).length > 0) {
    updatePayload.conversation_config = conversationConfigUpdate;
  }

  if (agentData.evaluation_criteria !== undefined) {
    if (!updatePayload.platform_settings) {
      updatePayload.platform_settings = {};
    }
    if (!updatePayload.platform_settings.evaluation) {
      updatePayload.platform_settings.evaluation = {};
    }
    updatePayload.platform_settings.evaluation.criteria = agentData.evaluation_criteria;
  }
  
  if (!updatePayload.platform_settings) {
    updatePayload.platform_settings = {};
  }
  updatePayload.platform_settings.overrides = {
    conversation_config_override: {
      conversation: {
        text_only: true,
      },
      agent: {
        first_message: false,
        language: false,
        prompt: {
          prompt: true,
        },
      },
    },
  };

  if (Object.keys(updatePayload).length === 0) {
    console.log("No changes to update for agent:", agentId);
    return;
  }

  console.log(
    `Sending PATCH payload to ElevenLabs for agent ${agentId}:`,
    JSON.stringify(updatePayload, null, 2)
  );

  try {
    const response = await fetch(`${API_BASE_URL}/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (updateAgent ${agentId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      try {
        const parsedError = JSON.parse(errorBody);
        console.error("Parsed ElevenLabs Error:", parsedError);
      } catch (e) {
      }
      throw new Error(
        `Failed to update agent ${agentId} via ElevenLabs: ${response.status} ${response.statusText}`
      );
    }
    console.log(`Agent ${agentId} updated successfully.`);
  } catch (error) {
    console.error(`Error updating ElevenLabs agent ${agentId}:`, error);
    if (
      error instanceof Error &&
      (error.message.startsWith("Failed to update agent") ||
        error.message === "ElevenLabs API key is not configured.")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while updating agent ${agentId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function deleteElevenLabsAgent(agentId: string): Promise<void> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase).");
    throw new Error("ElevenLabs API key is not configured.");
  }
  if (!agentId) {
    console.error("Agent ID is required to delete an agent.");
    throw new Error("Agent ID is required for deletion.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/convai/agents/${agentId}`, {
      method: "DELETE",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
          console.warn(`Agent with ID ${agentId} not found for deletion, or already deleted.`);
          return;
      }
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (deleteAgent ${agentId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to delete agent ${agentId} via ElevenLabs: ${response.status} ${response.statusText}`
      );
    }
    console.log(`Agent ${agentId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting ElevenLabs agent ${agentId}:`, error);
     if (
      error instanceof Error &&
      (error.message.startsWith("Failed to delete agent") ||
        error.message === "ElevenLabs API key is not configured.")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while deleting agent ${agentId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface GetConversationsParams {
  agentId?: string;
  pageSize?: number;
  cursor?: string | null;
  callStartBeforeUnix?: number;
  callStartAfterUnix?: number;
}

export async function getElevenLabsConversations(
  params: GetConversationsParams
): Promise<ConversationsResponse> {
  const {
    agentId,
    pageSize,
    cursor,
    callStartBeforeUnix,
    callStartAfterUnix,
  } = params;

  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase).");
    throw new Error("ElevenLabs API key is not configured.");
  }
  const limit = pageSize || 100;

  const url = new URL(`${API_BASE_URL}/v1/convai/conversations`);
  url.searchParams.append("limit", limit.toString());
  if (agentId) {
    url.searchParams.append("agent_id", agentId);
  }
  if (cursor) {
    url.searchParams.append("cursor", cursor);
  }
  if (callStartBeforeUnix) {
    url.searchParams.append("call_start_before_unix", callStartBeforeUnix.toString());
  }
  if (callStartAfterUnix) {
    url.searchParams.append("call_start_after_unix", callStartAfterUnix.toString());
  }
  
  console.log(`Fetching conversations from URL: ${url.toString()}`);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (getConversations - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to fetch conversations from ElevenLabs: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.conversations)) {
        console.error("Unexpected response structure from ElevenLabs getConversations:", data);
        throw new Error("Unexpected response structure for conversations.");
    }
    return data as ConversationsResponse;
  } catch (error) {
    console.error("Error fetching ElevenLabs conversations:", error);
    if (
      error instanceof Error &&
      (error.message.startsWith("Failed to fetch conversations") ||
        error.message === "ElevenLabs API key is not configured.")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching conversations: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function getConversationAudio(conversationId: string): Promise<Response> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase).");
    throw new Error("ElevenLabs API key is not configured.");
  }

  if (!conversationId) {
    console.error("Conversation ID is required to fetch audio.");
    throw new Error("Conversation ID is required.");
  }

  const url = `${API_BASE_URL}/v1/convai/conversations/${conversationId}/audio`;
  console.log(`Fetching audio from URL: ${url}`); 

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
      },
    });

    if (!response.ok) {
      let errorDetails = `ElevenLabs API Error (getConversationAudio ${conversationId} - ${response.status} ${response.statusText})`;
      try {
        const errorBody = await response.text(); 
        errorDetails += ` - Body: ${errorBody}`;
      } catch (e) {
      }
      console.error(errorDetails);
      throw new Error(
        `Failed to fetch audio for conversation ${conversationId}: ${response.status} ${response.statusText}`
      );
    }
    
    return response;

  } catch (error) {
    console.error(`Error fetching audio for conversation ${conversationId}:`, error);
    if (
      error instanceof Error &&
      (error.message.startsWith("Failed to fetch audio") ||
        error.message === "ElevenLabs API key is not configured." ||
        error.message === "Conversation ID is required.")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching audio for ${conversationId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function getDetailedConversation(conversationId: string): Promise<DetailedConversation> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase).");
    throw new Error("ElevenLabs API key is not configured.");
  }

  if (!conversationId) {
    console.error("Conversation ID is required to fetch detailed conversation data.");
    throw new Error("Conversation ID is required.");
  }

  const url = `${API_BASE_URL}/v1/convai/conversations/${conversationId}`;
  console.log(`Fetching detailed conversation from URL: ${url}`); 

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (getDetailedConversation ${conversationId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      try {
        const parsedError = JSON.parse(errorBody);
        console.error("Parsed ElevenLabs Error:", parsedError);
      } catch (e) {
      }
      throw new Error(
        `Failed to fetch detailed conversation ${conversationId}: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data || !data.conversation_id || !data.transcript) {
        console.error("Unexpected response structure from ElevenLabs getDetailedConversation:", data);
        throw new Error("Unexpected response structure for detailed conversation.");
    }
    return data as DetailedConversation;

  } catch (error) {
    console.error(`Error fetching detailed conversation ${conversationId}:`, error);
    if (
      error instanceof Error &&
      (error.message.startsWith("Failed to fetch detailed conversation") ||
        error.message === "ElevenLabs API key is not configured." ||
        error.message === "Conversation ID is required.")
    ) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching detailed conversation ${conversationId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface ElevenLabsKnowledgeBaseFile {
  id: string;
  name: string;
}

export async function uploadFileToElevenLabsKnowledgeBase(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string = "application/pdf"
): Promise<ElevenLabsKnowledgeBaseFile> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured.");
  }

  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: fileType }), fileName);

  const url = `${API_BASE_URL}/v1/convai/knowledge-base/file`;
  console.log(`Uploading file to ElevenLabs Knowledge Base: ${fileName}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Xi-Api-Key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (uploadFileToKnowledgeBase - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to upload file to ElevenLabs Knowledge Base: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json();
    if (!data || !data.id || !data.name) {
      console.error("Unexpected response structure from ElevenLabs KB upload:", data);
      throw new Error("Unexpected response structure after uploading to KB.");
    }
    return data as ElevenLabsKnowledgeBaseFile;
  } catch (error) {
    console.error("Error uploading file to ElevenLabs Knowledge Base:", error);
    if (error instanceof Error && error.message.startsWith("Failed to upload file")) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while uploading to KB: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function triggerElevenLabsRagIndexing(documentationId: string): Promise<void> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured.");
  }
  if (!documentationId) {
    throw new Error("Documentation ID is required to trigger RAG indexing.");
  }

  const url = `${API_BASE_URL}/v1/convai/knowledge-base/${documentationId}/rag-index`;
  console.log(`Triggering RAG indexing for Knowledge Base item: ${documentationId} at URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "e5_mistral_7b_instruct" }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (triggerElevenLabsRagIndexing ${documentationId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to trigger RAG indexing for ${documentationId}: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }
    if (response.status === 202 || response.status === 200 || response.status === 204) {
        console.log(`RAG indexing successfully triggered for Knowledge Base item: ${documentationId}. Status: ${response.status}`);
    } else {
        console.warn(`RAG indexing trigger for ${documentationId} returned status ${response.status}. Body: ${await response.text()}`);
    }
  } catch (error) {
    console.error(`Error triggering RAG indexing for KB item ${documentationId}:`, error);
    if (error instanceof Error && error.message.startsWith("Failed to trigger RAG indexing")) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while triggering RAG indexing for ${documentationId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface KnowledgeBaseItem {
  id: string;
  name: string;
  type: 'file' | 'text' | string;
  extracted_inner_html?: string;
}

export async function updateAgentKnowledgeBase(
  agentId: string,
  knowledgeBaseItems: KnowledgeBaseItem[]
): Promise<void> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured.");
  }
  if (!agentId) {
    throw new Error("Agent ID is required to update knowledge base.");
  }

  const currentAgentDetails = await getElevenLabsAgentDetails(agentId);
  const existingAgentKb = currentAgentDetails?.conversation_config?.agent?.prompt?.knowledge_base || [];
  
  let finalKnowledgeBase = existingAgentKb.filter(item => item.type !== 'file');
  finalKnowledgeBase.push(...knowledgeBaseItems);

  const payload = {
    conversation_config: {
      agent: {
        prompt: {
          knowledge_base: finalKnowledgeBase,
        },
      },
    },
  };

  console.log(
    `Updating knowledge base for ElevenLabs agent ${agentId} with:`,
    JSON.stringify(knowledgeBaseItems, null, 2)
  );
  console.log(
    `Full PATCH payload for agent ${agentId} KB update:`,
    JSON.stringify(payload, null, 2)
  );


  const url = `${API_BASE_URL}/v1/convai/agents/${agentId}`;
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (updateAgentKnowledgeBase ${agentId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to update agent knowledge base for ${agentId}: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }
    console.log(`Knowledge base for agent ${agentId} updated successfully.`);
  } catch (error) {
    console.error(`Error updating knowledge base for agent ${agentId}:`, error);
     if (error instanceof Error && error.message.startsWith("Failed to update agent knowledge base")) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while updating agent KB for ${agentId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface ElevenLabsKnowledgeBaseTextResponse {
  id: string;
  name: string;
}

export async function addTextToElevenLabsKnowledgeBase(
  name: string,
  text: string
): Promise<ElevenLabsKnowledgeBaseTextResponse> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured.");
  }

  if (!name || !text) {
    throw new Error("Name and text are required to add to knowledge base.");
  }

  const payload = {
    name: name,
    text: text,
  };

  const url = `${API_BASE_URL}/v1/convai/knowledge-base/text`;
  console.log(`Adding text to ElevenLabs Knowledge Base: ${name}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (addTextToKnowledgeBase - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to add text to ElevenLabs Knowledge Base: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json();
    if (!data || !data.id || !data.name) {
      console.error("Unexpected response structure from ElevenLabs KB text add:", data);
      throw new Error("Unexpected response structure after adding text to KB.");
    }
    return data as ElevenLabsKnowledgeBaseTextResponse;
  } catch (error) {
    console.error("Error adding text to ElevenLabs Knowledge Base:", error);
    if (error instanceof Error && error.message.startsWith("Failed to add text")) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while adding text to KB: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface ElevenLabsKnowledgeBaseItemDetails extends KnowledgeBaseItem {
}

export async function getElevenLabsKnowledgeBaseItemText(
  itemId: string
): Promise<string | null> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ElevenLabs API key is not configured.");
  }
  if (!itemId) {
    throw new Error("Knowledge base item ID is required.");
  }

  const url = `${API_BASE_URL}/v1/convai/knowledge-base/${itemId}`;
  console.log(`Fetching knowledge base item details from: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (getKnowledgeBaseItemDetails ${itemId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      if (response.status === 404) return null;
      throw new Error(
        `Failed to fetch knowledge base item details: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data: ElevenLabsKnowledgeBaseItemDetails = await response.json();
    
    if (data.type === "text" && data.extracted_inner_html) {
      return data.extracted_inner_html;
    } else if (data.type === "text" && !data.extracted_inner_html) {
      console.warn(`Knowledge base item ${itemId} is type 'text' but has no extracted_inner_html content.`);
      return "";
    }
    console.warn(`Knowledge base item ${itemId} is not of type 'text' or extracted_inner_html content is missing.`);
    return null;
  } catch (error) {
    console.error("Error fetching knowledge base item details:", error);
    if (error instanceof Error && (error.message.startsWith("Failed to fetch") || error.message.includes("API key"))) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching KB item ${itemId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface SimplifiedToolInfo {
  id: string;
  name: string;
  description: string;
  isActive?: boolean;
}

interface ElevenLabsToolConfigFromAPI {
  name?: string;
  description?: string;
}

interface ElevenLabsToolDetailFromAPI {
  id: string;
  tool_config: ElevenLabsToolConfigFromAPI;
}

export async function getElevenLabsTools(): Promise<SimplifiedToolInfo[]> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured (either locally or via Supabase) for getElevenLabsTools.");
    throw new Error("ElevenLabs API key is not configured.");
  }

  const url = `${API_BASE_URL}/v1/convai/tools`;
  console.log(`Fetching ElevenLabs tools from: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Xi-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (getElevenLabsTools - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to fetch tools from ElevenLabs: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json();
    
    if (data && Array.isArray(data.tools)) {
      const tools: ElevenLabsToolDetailFromAPI[] = data.tools;
      return tools.map(tool => ({
        id: tool.id,
        name: tool.tool_config?.name || "Unnamed Tool",
        description: tool.tool_config?.description || "No description available.",
      })).filter(tool => tool.name !== "Unnamed Tool" && tool.id);
    } else if (Array.isArray(data)) {
       console.warn("Received a direct array of tools, expected { tools: [...] } structure.");
       const tools: ElevenLabsToolDetailFromAPI[] = data;
       return tools.map(tool => ({
        id: tool.id,
        name: tool.tool_config?.name || "Unnamed Tool",
        description: tool.tool_config?.description || "No description available.",
      })).filter(tool => tool.name !== "Unnamed Tool" && tool.id);
    } else {
      console.error("Unexpected response structure from ElevenLabs getElevenLabsTools:", data);
      throw new Error("Unexpected response structure for tools list.");
    }

  } catch (error) {
    console.error("Error fetching ElevenLabs tools:", error);
    if (error instanceof Error && (error.message.startsWith("Failed to fetch tools") || error.message.includes("API key"))) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while fetching ElevenLabs tools: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function deleteElevenLabsTool(toolId: string): Promise<void> {
  const apiKey = await getElevenLabsApiKey();
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured for deleteElevenLabsTool.");
    throw new Error("ElevenLabs API key is not configured.");
  }

  if (!toolId) {
    console.error("Tool ID is required to delete an ElevenLabs tool.");
    throw new Error("Tool ID is required for deletion.");
  }

  const url = `${API_BASE_URL}/v1/convai/tools/${toolId}`;
  console.log(`Attempting to delete ElevenLabs tool with ID: ${toolId} from URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Xi-Api-Key": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Tool with ID ${toolId} not found on ElevenLabs for deletion, or already deleted.`);
        return;
      }
      const errorBody = await response.text();
      console.error(
        `ElevenLabs API Error (deleteElevenLabsTool ${toolId} - ${response.status} ${response.statusText}):`,
        errorBody
      );
      throw new Error(
        `Failed to delete tool ${toolId} from ElevenLabs: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }
    console.log(`Tool ${toolId} deleted successfully from ElevenLabs.`);
  } catch (error) {
    console.error(`Error deleting ElevenLabs tool ${toolId}:`, error);
    if (error instanceof Error && (error.message.startsWith("Failed to delete tool") || error.message.includes("API key"))) {
      throw error;
    }
    throw new Error(
      `An unexpected error occurred while deleting ElevenLabs tool ${toolId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
