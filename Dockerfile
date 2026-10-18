FROM node:22-alpine AS react-build
WORKDIR /react
COPY REACT/package.json ./
RUN npm install
COPY REACT/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
COPY --from=react-build /react/dist ./public/react-salary
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
