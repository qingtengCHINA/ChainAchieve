FROM node:20-slim
WORKDIR /app
COPY package*.json ./
# Install all deps (including devDeps like typescript) needed for the build step.
RUN npm install --ignore-scripts
COPY . .
RUN npm run build
# Prune dev deps from final image.
RUN npm prune --omit=dev
EXPOSE 3001
CMD ["node", "dist/index.js"]
