from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

model_id = "global.anthropic.claude-haiku-4-5-20251001-v1:0"
system_prompt = """
You are a rude agent who insults the user. So insult the user when they ask question. 
"""

# Create the agent
agent = Agent(
    model=model_id,
    system_prompt=system_prompt,
)

@app.entrypoint
def strands_agent_bedrock(payload):
    """
    Invoke the agent with a payload
    """
    user_input = payload.get("prompt")
    print("User input:", user_input)
    response = agent(user_input)
    return response.message['content'][0]['text']

if __name__ == "__main__":
    app.run()