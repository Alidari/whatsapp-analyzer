# Adım 1: Uygulamayı Derleme (Build)
FROM node:20-alpine AS build

# Çalışma dizinini ayarla
WORKDIR /app

# Paket dosyalarını kopyala ve bağımlılıkları kur
COPY package*.json ./
RUN npm install

# Proje dosyalarını kopyala ve build al (dist klasörü oluşur)
COPY . .
RUN npm run build

# Adım 2: Nginx ile Servis Etme
FROM nginx:alpine

# Özel Nginx konfigürasyonunu kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build aşamasında oluşan dist klasörünü nginx'in web kök dizinine kopyala
COPY --from=build /app/dist /usr/share/nginx/html

# Portu aç
EXPOSE 80

# Nginx'i başlat
CMD ["nginx", "-g", "daemon off;"]
