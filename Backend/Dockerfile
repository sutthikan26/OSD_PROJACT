FROM node:20-alpine

WORKDIR /app


COPY package*.json ./

# ติดตั้ง dependencies เฉพาะ production
RUN npm ci --only=production


COPY . .

# ตั้งค่าเริ่มต้นสำหรับ Render และ Mock Data
ENV PORT=10000
ENV USE_MOCK_DATA=true
ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "server.js"]