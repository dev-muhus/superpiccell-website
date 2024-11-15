# Super Piccell Website Project

This project is a website for the Super Piccell project, built using Next.js and Docker, with Contentful for content management. It is designed to be flexible and reusable for other projects by simply updating the environment variables.

## Project Structure

- **frontend**: The Next.js frontend application.
- **backend**: Placeholder for future backend services.

---

## Frontend

The frontend of this project is built with Next.js. The setup is containerized with Docker and uses Contentful for CMS integration.

### Prerequisites

Before you start, ensure you have the following:

- Docker and Docker Compose installed
- Contentful account with API tokens (Space ID, Access Token, etc.)
- Alchemy account for blockchain API integration (API Key required)
- Configured environment variables (`.env.local`)

---

## How to Reuse

To reuse this project for other purposes, update the environment variables in `.env.local` to match your new project’s requirements. Adjustments can include:

- Blockchain configuration (e.g., contract address, network details)
- Contentful content type IDs
- Alchemy network settings

### Setup Instructions

1. **Clone the repository**:

   ```
   git clone <repository-url>
   cd superpiccell-website
   ```

2. **Configure environment variables**:

   - At the project root, create a `.env` file with the following content:
     ```
     PORT=3000
     ```

   - In the `frontend` directory, ensure a `.env.local` file is present with the following variables:
     ```
     # Project-wide settings
     NEXT_PUBLIC_SITE_TITLE="Super Piccell"
     NEXT_PUBLIC_SITE_DESCRIPTION="Welcome to the Super Piccell project!"
     NEXT_PUBLIC_INFURA_PROJECT_ID=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_CONTRACT_ADDRESS=XXXXXXXXXXXXXXXX

     # Contentful-specific settings
     NEXT_PUBLIC_CONTENTFUL_SPACE_ID=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT=master
     NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_GALLERY="gallery"
     NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_CHARACTER="character"

     # Alchemy API
     NEXT_PUBLIC_ALCHEMY_API_KEY=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_ALCHEMY_NETWORK="MATIC_MAINNET"

     # Contract and Blockchain settings
     NEXT_PUBLIC_MEMBERSHIP_CONTRACT=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_MEMBERSHIP_COLLECTION_NAME="XXX-XXXX-XXXXX"
     NEXT_PUBLIC_RPC_URL="https://polygon-rpc.com/"
     NEXT_PUBLIC_SCAN_URL="https://polygonscan.com/"
     NEXT_PUBLIC_CHAIN_ID="0x89"
     NEXT_PUBLIC_NETWORK_NAME="Polygon Mainnet"
     NEXT_PUBLIC_CURRENCY_NAME="MATIC"
     NEXT_PUBLIC_CURRENCY_SYMBOL="MATIC"
     NEXT_PUBLIC_CURRENCY_DECIMALS="18"

     # Style settings
     NEXT_PUBLIC_HEADER_IMAGE_URL="image/main.png"
     NEXT_PUBLIC_OVERLAY_IMAGE_URL="image/main_icon.png"
     NEXT_PUBLIC_OVERLAY_TEXT="Web3 native media franchise project"
     NEXT_PUBLIC_HEADER_IMAGE_HEIGHT="600px"
     NEXT_PUBLIC_HEADER_BG_COLOR="#2C3E50"
     NEXT_PUBLIC_HEADER_TEXT_COLOR="#ffffff"
     NEXT_PUBLIC_FOOTER_BG_COLOR="#2C3E50"
     NEXT_PUBLIC_FOOTER_TEXT_COLOR="#ffffff"
     NEXT_PUBLIC_COPYRIGHT_BG_COLOR="#1a1a1a"
     NEXT_PUBLIC_COPYRIGHT_TEXT_COLOR="#cccccc"
     NEXT_PUBLIC_SCROLL_BUTTON_BG_COLOR="#2563eb"
     NEXT_PUBLIC_SCROLL_BUTTON_TEXT_COLOR="#ffffff"

     # Google Analytics ID for tracking site metrics
     NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=XXXXXXXXXXXXXXXXXXXXXXX
     ```

### Starting the Frontend

1. **Build and start the Docker container**:

   ```
   docker compose down
   docker compose up -d --build
   ```

2. **Install dependencies**:

   After the container starts, log in and install dependencies manually:

   ```
   docker compose exec frontend bash
   npm install
   ```

3. **Run the development server**:

   ```
   npm run dev
   ```

   Access the application at [http://localhost:3000](http://localhost:3000).

---

## Backend (To Be Added)

The backend setup instructions and configurations will be provided once a backend service is added to the project. 

---

## License

This project is in the Public Domain.
