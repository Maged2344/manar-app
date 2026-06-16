FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy website files
COPY frontend/index.html /usr/share/nginx/html/
COPY frontend/about.html /usr/share/nginx/html/
COPY frontend/styles.css /usr/share/nginx/html/
COPY frontend/script.js /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
