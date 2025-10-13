import boto3
import json
import uuid

# Configure your agent
AGENT_RUNTIME_ARN = "arn:aws:bedrock-agentcore:eu-central-1:816069161004:runtime/assisstant_agent-sgq9QE28p3"
REGION = "eu-central-1"

# Initialize client
client = boto3.client("bedrock-agentcore", region_name=REGION)

# Generate a unique session ID for this conversation
SESSION_ID = str(uuid.uuid4())

def ask_agent(question, session_id):
    """Ask the agent a question with session memory"""
    payload = {"prompt": question}
    
    try:
        response = client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            runtimeSessionId=session_id,  # ✅ This enables memory!
            qualifier="DEFAULT",
            payload=json.dumps(payload)
        )
        
        # Get response
        response_body = response["response"]
        chunks = [chunk for chunk in response_body]
        answer = b"".join(chunks).decode("utf-8")
        
        return answer
        
    except Exception as e:
        return f"Error: {e}"

# Main loop
print("=" * 60)
print("Chat with your agent (type 'quit' to exit)")
print(f"Session ID: {SESSION_ID}")
print("=" * 60)

while True:
    question = input("\nYou: ").strip()
    
    if question.lower() in ['quit', 'exit', 'q']:
        print("Goodbye!")
        break
    
    if not question:
        continue
    
    print("\nAgent: ", end="")
    answer = ask_agent(question, SESSION_ID)
    print(answer)