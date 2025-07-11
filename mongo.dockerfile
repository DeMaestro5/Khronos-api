FROM mongo:7.0

# Copy initialization script
COPY addons/init-mongo.js /docker-entrypoint-initdb.d/

# Expose MongoDB port
EXPOSE 27017

# Set default command
CMD ["mongod", "--bind_ip_all"] 