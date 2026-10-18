FROM node:22-alpine AS react-build
WORKDIR /react
COPY REACT/package.json ./
RUN npm install
COPY REACT/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json ./
RUN npm install --omit=dev
COPY --chown=node:node . .
COPY --from=react-build --chown=node:node /react/dist ./public/react-salary
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["npm", "start"]
