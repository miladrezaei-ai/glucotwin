from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands.models import BedrockModel

# Initialize app FIRST
app = BedrockAgentCoreApp()

# model_id = "eu.anthropic.claude-3-7-sonnet-20250219-v1:0"
model_id = "eu.amazon.nova-pro-v1:0"
model = BedrockModel(
    model_id=model_id,
)

agent = Agent(
    model=model
)

@app.entrypoint
def invoke(payload):
    """
    Process user input and return a response
    """
    print("Received payload:", payload)
    
    # Get prompt with default fallback
    user_message = payload.get("prompt", "Hello")
    
    print("User message:", user_message)
    
    # Call agent
    response = agent(user_message)
    
    # Return JSON serializable response (string or dict both work)
    return str(response.message["content"][0]["text"])

if __name__ == "__main__":
    app.run()