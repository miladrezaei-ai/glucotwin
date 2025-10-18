# GlucoAI Architecture

## Overview
GlucoAI is a serverless AI-powered glucose monitoring system built entirely on AWS.

## Architecture Components

### Frontend
- **React PWA** - Progressive web app for cross-platform compatibility
- **Recharts** - Real-time glucose visualization
- **AWS Amplify** - Authentication integration

### Authentication
- **Amazon Cognito** - Secure user management and authentication

### Backend (Serverless)
- **AWS Lambda** - Event-driven serverless functions
  - ChatHandler: AI conversation orchestration
  - FoodAnalyzer: Computer vision for nutritional analysis
  - Data CRUD operations (8 functions)
- **Lambda Function URLs** - Direct HTTPS endpoints (no API Gateway needed)

### Data Storage
- **Amazon DynamoDB** - NoSQL database for:
  - Glucose readings (time-series data)
  - Medication logs
  - Food entries
  - User profiles
- **Amazon S3** - Object storage for:
  - Food images
  - Glucose device CSV exports

### AI Services
- **Amazon Bedrock (Claude Sonnet 4)** - Advanced language model
- **Bedrock Vision API** - Food image analysis
- **Bedrock AgentCore** - Conversational memory management

### Event-Driven Processing
- **S3 Event Triggers** - Automatic food image analysis on upload

## Key Features
✅ Real-time glucose monitoring with AI insights
✅ Computer vision for automatic food nutrition analysis
✅ Medication tracking with glucose correlation
✅ Conversational AI with contextual memory
✅ Serverless architecture (scales automatically)
✅ Cost-optimized (Lambda Function URLs instead of API Gateway)

## Why Lambda Function URLs?
For this hackathon project, we chose Lambda Function URLs over API Gateway for:
- **Simplicity** - Faster development
- **Lower latency** - Direct invocation
- **Cost efficiency** - No API Gateway charges
- **Sufficient for MVP** - Meets all current requirements

### Future Enhancements
- Migrate to API Gateway for rate limiting and advanced routing
- Add caching layer (ElastiCache)
- Implement WebSocket for real-time updates
- Add Step Functions for complex workflows