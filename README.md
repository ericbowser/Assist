## Running the Project with Docker

To run this project using Docker, follow the steps below:

### Prerequisites

- Ensure Docker and Docker Compose are installed on your system.
- Verify that the required Node.js version is set to `22.14.0` as specified in the Dockerfile.

### Environment Variables

- The application uses environment variables defined in the `.env` file. Uncomment the `env_file` line in the `docker-compose.yaml` file to enable this.

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