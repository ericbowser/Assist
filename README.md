## E.R.B Assist API

A personal assistant backend using various AI APIs and LLMs.

## API Endpoints

### Connection & Health Check
- `GET /ping` - Simple ping/pong endpoint
- `GET /health` - Health check with system information
- `GET /api/status` - Connection status and available services
- `GET /api/info` - API information and available endpoints

### AI Chat Endpoints
- `POST /askClaude` - Chat with Claude (Anthropic)
- `POST /askGemini` - Chat with Gemini (Google)
- `POST /askDeepSeek` - Chat with DeepSeek
- `POST /askChat` - Chat with OpenAI GPT models
- `POST /askAssist` - Assistant with conversation history

### Image Generation Endpoints
- `POST /generateImageDallE` - Generate images with DALL-E
- `POST /textToImage` - Generate images with Hugging Face
- `POST /fluxImage` - Generate images with Flux
- `POST /flux2TurboImage` - Generate images with Flux 2 Turbo
- `POST /deepSeekImage` - Generate images with DeepSeek

### Other Endpoints
- `POST /sendEmail` - Send email via Gmail
- `POST /fetchPrompts` - Fetch prompts by category
- `POST /savePrompt` - Save a new prompt
- `GET /getExamQuestions` - Get exam questions
- `GET /getTransactions` - Get Alpaca transactions

## Running the Project with Docker

To run this project using Docker, follow the steps below:

### Prerequisites

- Ensure Docker and Docker Compose are installed on your system.
- Verify that the required Node.js version is set to `22.14.0` as specified in the Dockerfile.

### Environment Variables

- The application uses environment variables defined in the `.env` file. Uncomment the `env_file` line in the `docker-compose.yaml` file to enable this.
- Copy `.env.example` to `.env` and fill in your API keys and configuration:
  ```bash
  cp .env.example .env
  ```

### Build and Run Instructions

1. Build the Docker images and start the services:

   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:32636`.

### Service Configuration

- **App Service**:
  - Exposes port `32636`.
  - Depends on the `database` service.
- **Database Service**:
  - Uses the `postgres:latest` image.
  - Stores data in the `db_data` volume.

### Notes

- Ensure the `db_data` volume is properly configured for persistent database storage.
- Modify the `POSTGRES_USER` and `POSTGRES_PASSWORD` environment variables in the `docker-compose.yaml` file as needed for your setup.

By following these instructions, you can successfully run the project using Docker.

## Running Locally (Development)

For local development without Docker:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The server will be available at `http://localhost:32636`

### CORS Configuration

The backend is configured to accept requests from common frontend development ports:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:5173` (Vite default)

You can customize the `FRONTEND_URL` environment variable to allow additional origins.

### Testing the Connection

Use the health check endpoint to verify the backend is running:
```bash
curl http://localhost:32636/health
```

Or check the connection status:
```bash
curl http://localhost:32636/api/status
```