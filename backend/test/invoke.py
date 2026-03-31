import boto3
import json

# Initialize the Bedrock AgentCore client in the same region as your agent
agentcore_client = boto3.client('bedrock-agentcore', region_name='eu-central-1')

# Your Agent Runtime ARN (from the deployment step)
# You can find this in the Bedrock console under your agent’s runtime details,
# or in the deployment confirmation message.
AGENT_RUNTIME = "arn:aws:bedrock-agentcore:eu-central-1:911101829662:runtime/gluco_agent-nNzGxaE4AP"

# Prompt to send to the agent
PROMPT = "How can I reduce sugar in my blood?"

# Invoke the agent
boto3_response = agentcore_client.invoke_agent_runtime(
    agentRuntimeArn=AGENT_RUNTIME,
    qualifier="DEFAULT",
    payload=json.dumps({"prompt": PROMPT})
)

# The response is streamed in chunks; read them all into memory
response_body = boto3_response['response']
all_chunks = [chunk for chunk in response_body]

# Combine chunks into one string
complete_response = b''.join(all_chunks).decode('utf-8')

# Attempt to parse JSON output
try:
    response_json = json.loads(complete_response)
    print(response_json)
except json.JSONDecodeError:
    print("Raw response:")
    print(complete_response)