# Super Piccell Website Project

This project is a website for the Super Piccell project, built using Next.js and Docker, with Contentful for content management.

## Project Structure

- **frontend**: The Next.js frontend application.
- **backend**: Placeholder for future backend services.

---

## Frontend

The frontend of this project is built with Next.js. The setup is containerized with Docker and uses Contentful for CMS integration.

### Prerequisites

- Docker and Docker Compose installed
- Contentful account with necessary API tokens

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
     NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_GALLERY="image"
     NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_CHARACTER="character"

     # Alchemy API
     NEXT_PUBLIC_ALCHEMY_API_KEY=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_ALCHEMY_NETWORK="MATIC_MAINNET"

     # Infura API
     NEXT_PUBLIC_INFURA_URL=https://polygon-mainnet.infura.io/v3/
     NEXT_PUBLIC_INFURA_PROJECT_ID=XXXXXXXXXXXXXXXX

     # Contract and Blockchain settings
     NEXT_PUBLIC_SUPERPICCELL_MEMBERSHIP_CONTRACT=XXXXXXXXXXXXXXXX
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
