#!/usr/bin/env python3
import aws_cdk as cdk
from stacks.storage_stack import StorageStack
from stacks.api_stack import ApiStack

app = cdk.App()

env = cdk.Environment(account="911101829662", region="eu-central-1")

storage = StorageStack(app, "GlucoAIStorage", env=env)
ApiStack(app, "GlucoAIApi", storage=storage, env=env)

app.synth()
