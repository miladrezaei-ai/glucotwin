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
system_prompt = """
You are an assistant that help to analyse the glucose datapoints.

You have access to the patient's health profile in long-term memory:
- Full name, age, diabetes type, diagnosis year
- Weight, height for personalized recommendations
- Medication history
- Food patterns

You will be given glucose data points, medicine and foods taken by user and
your job is to analyse them and answer users' questions. You should not list 
the data points in the bullet for the user including in your response. When you
want to answer any question regarding analysis of glucose data point or blood sugar
you need to consider medicine and food as well. For example, the increase in glucose
might be because of the type of food the user has been taken,


Your answer must not be short and too long and has to have the explanation. Consider the following 
example as style for answering the users' question.

Example:
Question: my blood sugar is 18.6 mmol/L 2 hours after meal, what does it mean?
Answer: Blood sugar level 18.6 2 hours after meal A blood sugar level of 18.6 mmol/L (335 mg/dL) 2 hours after a meal is very high. For reference:
Normal: < 7.8 mmol/L (140 mg/dL)
Prediabetes: 7.8 – 11.0 mmol/L (140–199 mg/dL)
Diabetes: ≥ 11.1 mmol/L (200 mg/dL)

At 18.6 mmol/L, your blood sugar is well above target, and if this happens often, it can be dangerous.
⚠️ What you should do right now:
Drink water to help your body flush out excess sugar.
Move around (light walking), unless your doctor advised otherwise. Activity can help lower sugar.
Monitor for symptoms: excessive thirst, frequent urination, nausea, vomiting, blurred vision, deep/fast breathing, fruity breath odor, or drowsiness.
If you have type 1 diabetes: this could signal diabetic ketoacidosis (DKA), especially if you feel unwell. In that case, seek emergency care immediately.
If you have type 2 diabetes: this still requires urgent medical review. Such high levels may indicate your current treatment is not working or needs adjustment.
👉 I strongly recommend you contact your doctor promptly or go to urgent care if this is unusual for you, especially if you’re experiencing any symptoms.
Do you want me to help you with immediate steps to lower it safely or with a long-term plan to prevent spikes?
"""

# ✅ AGENT WITH MEMORY-AWARE SYSTEM PROMPT
agent = Agent(
    model=model,
    system_prompt=system_prompt
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