from strands import Agent
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands.models import BedrockModel
from bedrock_agentcore_starter_toolkit.operations.memory.manager import MemoryManager
from bedrock_agentcore_starter_toolkit.operations.memory.models.strategies import (
    SummaryStrategy, 
    UserPreferenceStrategy
)

REGION = "eu-central-1"
MEMORY_NAME = "GlucoseAssistantMemory"

# Initialize app
app = BedrockAgentCoreApp()

# ✅ BUILD THE FUCKING MEMORY
print("🔧 Initializing Memory Manager...")
memory_manager = MemoryManager(region_name=REGION)

try:
    print(f"🔍 Creating memory: {MEMORY_NAME}")
    
    memory = memory_manager.get_or_create_memory(
        name=MEMORY_NAME,
        strategies=[
            # ✅ STORES PATIENT PROFILE PERMANENTLY (STATIC USER ID)
            UserPreferenceStrategy(
                name="UserHealthProfile",
                description="Stores patient diabetes profile permanently",
                namespaces=["/users/{actorId}/profile"]  # actorId = STATIC userId
            ),
            # ✅ STORES SESSION SUMMARIES
            SummaryStrategy(
                name="SessionSummarizer",
                description="Summarizes glucose conversations",
                namespaces=["/summaries/{actorId}/{sessionId}"]
            )
        ],
    )
    
    memory_id = memory.get("id")
    print(f"✅ AgentCore Memory ACTIVE: {memory_id}")
    
except Exception as e:
    print(f"❌ Memory error: {e}")
    import traceback
    traceback.print_exc()

# Initialize model
model_id = "eu.amazon.nova-pro-v1:0"
model = BedrockModel(model_id=model_id)

# ✅ AGENT WITH MEMORY-AWARE SYSTEM PROMPT
agent = Agent(
    model=model,
    system_prompt="""You are GlucoAI, an expert AI assistant for diabetes management.

CRITICAL: You have access to the patient's health profile in long-term memory:
- Full name, age, diabetes type, diagnosis year
- Weight, height for personalized recommendations
- Medication history
- Food patterns

Always reference their profile when giving advice. For example:
- "Since you have Type 2 diabetes..."
- "Given your weight of 75kg..."
- "As someone diagnosed in 2020..."

Be empathetic, personalized, and evidence-based. Track progress across conversations."""
)

@app.entrypoint
def invoke(payload):
    """Process with automatic memory retrieval"""
    print("📥 Agent received payload")
    
    if "body" in payload:
        import json
        body = json.loads(payload["body"]) if isinstance(payload["body"], str) else payload["body"]
    else:
        body = payload
    
    user_message = body.get("message") or body.get("prompt", "Hello")
    session_id = body.get("sessionId", "default-session")
    user_id = body.get("userId", "demo-user")
    
    print(f"👤 User: {user_id} | Session: {session_id}")
    
    # ✅ AGENT AUTOMATICALLY RETRIEVES PROFILE FROM MEMORY
    response = agent(user_message)
    
    reply = response.message["content"][0]["text"]
    
    print(f"✅ Reply generated")
    
    import json
    return {
        "statusCode": 200,
        "body": json.dumps({
            "reply": reply,
            "sessionId": session_id,
            "userId": user_id
        })
    }

def lambda_handler(event, context):
    return invoke(event)

if __name__ == "__main__":
    app.run()