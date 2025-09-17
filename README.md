## 🚀 Getting Started

### 1. Request Secrets
Before running this project, you must obtain the required environment secrets from the administrator.  
These include:
- AWS Bedrock credentials  
- Azure OCR credentials  
- Any other provider tokens (OpenAI, Anthropic, etc.)  

⚠️ Do not commit these keys to GitHub. Keep them only in your local `.env.local` file.

---

### 2. Create `.env.local`
Create a file named `.env.local` in the root of the project and paste the secrets provided by the administrator.  
For example:

# AWS Bedrock Configuration
AWS_BEDROCK_REGION=us-west-2
AWS_BEDROCK_ACCESS_KEY_ID=****************
AWS_BEDROCK_SECRET_ACCESS_KEY=****************
AWS_BEDROCK_DEFAULT_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0

# Azure OCR Configuration
AZURE_OCR_ENDPOINT=https://penguin-ocr-stage.cognitiveservices.azure.com/
AZURE_OCR_SECRET_KEY=****************

---

### 3. Install Dependencies
Navigate into the repo:

cd bold.diy
npm install -f

---

### 4. Run the Development Server

npm run dev

By default, the app will be available at:
http://localhost:5173

---

### 🔑 Notes
- Never share your `.env.local` or commit it to version control.  
- If you need access to secrets, contact the project administrator.  
- In production, these secrets are injected via environment variables, not `.env.local`.