FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalação apenas das dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia do código-fonte
COPY . .

# Execução com usuário não-root por segurança
USER node

EXPOSE 3000

CMD ["npm", "start"]
