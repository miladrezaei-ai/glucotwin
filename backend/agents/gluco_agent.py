import os
import httpx
from datetime import datetime, timedelta
from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp.mcp_client import MCPClient

app = BedrockAgentCoreApp()

model_id = "global.anthropic.claude-haiku-4-5-20251001-v1:0"

# Gateway config — set these as environment variables in AgentCore
GATEWAY_MCP_URL = os.environ.get("GATEWAY_MCP_URL")
GATEWAY_CLIENT_ID = os.environ.get("GATEWAY_CLIENT_ID")
GATEWAY_CLIENT_SECRET = os.environ.get("GATEWAY_CLIENT_SECRET")
GATEWAY_TOKEN_ENDPOINT = os.environ.get("GATEWAY_TOKEN_ENDPOINT")
GATEWAY_SCOPE = os.environ.get("GATEWAY_SCOPE")

_token_cache = {"token": None, "expires_at": None}

def get_oauth_token():
    if _token_cache["token"] and _token_cache["expires_at"] and datetime.now() < _token_cache["expires_at"]:
        return _token_cache["token"]
    response = httpx.post(
        GATEWAY_TOKEN_ENDPOINT,
        data={
            "grant_type": "client_credentials",
            "client_id": GATEWAY_CLIENT_ID,
            "client_secret": GATEWAY_CLIENT_SECRET,
            "scope": GATEWAY_SCOPE
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        data = response.json()
        token = data["access_token"]
        expires_in = data.get("expires_in", 3600) - 300
        _token_cache["token"] = token
        _token_cache["expires_at"] = datetime.now() + timedelta(seconds=expires_in)
        return token
    raise Exception(f"Failed to get OAuth token: {response.status_code} - {response.text}")

def get_mcp_client() -> MCPClient:
    token = get_oauth_token()
    return MCPClient(
        lambda: streamablehttp_client(
            GATEWAY_MCP_URL,
            headers={"Authorization": f"Bearer {token}"}
        )
    )

BASE_SYSTEM_PROMPT = """
You are GlucoAI, a compassionate and knowledgeable AI health assistant specializing in diabetes management and glucose monitoring.

IMPORTANT: The user's glucose data is from year 2000-2001. When the user says "last 4 days", "this week", "recently" etc., 
query the most recent data available which is around April-May 2001. 
Use startDate around 2001-04-01 and endDate around 2001-05-31 as the default range unless the user specifies otherwise.

Your role:
- Help users understand their glucose patterns, trends, and anomalies
- Use the queryGlucoseData tool whenever the user asks about glucose levels for any time period
- Be specific and data-driven — always reference actual numbers from the data
- Identify patterns: morning highs, post-meal spikes, overnight trends

When answering:
- Always call queryGlucoseData with the correct startDate and endDate
- Summarize: average, min, max, time in range (70-180 mg/dL)
- Explain what the numbers mean for the user

Tone: warm, supportive, professional. Never alarmist.
"""

@app.entrypoint
def strands_agent_bedrock(payload):
    user_id = payload.get("userId", "sdfdsf")
    user_input = payload.get("prompt")
    today = "2001-05-31"

    mcp_client = get_mcp_client()

    with mcp_client:
        gateway_tools = mcp_client.list_tools_sync()

        session_agent = Agent(
            model=model_id,
            system_prompt=BASE_SYSTEM_PROMPT,
            tools=gateway_tools,
        )

        response = session_agent(
            f"[User ID: {user_id}] [Today's date: {today}]\n\n{user_input}"
        )

    # Extract text from response
    content = response.message.get('content', [])
    print(f"[DEBUG] response.message keys: {list(response.message.keys())}")
    print(f"[DEBUG] content type: {type(content).__name__}, value: {repr(content)[:500]}")
    
    if isinstance(content, list):
        text_blocks = [block.get('text', '') for block in content if isinstance(block, dict) and block.get('type') == 'text']
        reply = ' '.join(text_blocks).strip()
    elif isinstance(content, str):
        reply = content.strip()
    else:
        reply = str(content)

    if not reply:
        print(f"[WARN] Empty reply. Full message: {repr(response.message)[:1000]}")

    return reply

if __name__ == "__main__":
    app.run()
