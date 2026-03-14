# Stage 1: Build and compile contracts
FROM node:18-alpine AS contracts_stage

WORKDIR /usr/src/app

# Install Hardhat dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy Hardhat project files
COPY contracts ./contracts
COPY scripts ./scripts
COPY test ./test
COPY hardhat.config.js ./
COPY .env.example ./
COPY allowlist.json ./
COPY metadata ./metadata
COPY images ./images

# Compile contracts
RUN npx hardhat compile

# Stage 2: Build and run Next.js frontend
FROM node:18-alpine AS frontend_stage

WORKDIR /usr/src/app

# Copy compiled contract artifacts from contracts_stage
COPY --from=contracts_stage /usr/src/app/artifacts ./artifacts
COPY --from=contracts_stage /usr/src/app/frontend/contracts ./frontend/contracts

# Copy frontend package.json and install dependencies
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install

# Copy the rest of the frontend files
COPY frontend ./frontend

# Expose port for Next.js dev server
EXPOSE 3000

# Command to run the Next.js development server
CMD ["npm", "run", "dev", "--prefix", "frontend"]
